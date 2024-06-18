import React, { useEffect, useRef, useState } from 'react'
import MonacoEditor, { monaco } from 'react-monaco-editor'
import * as monacoEditor from 'monaco-editor'
import { createPureProposals, Nullable } from 'uiSrc/utils'
import { IEditorMount } from 'uiSrc/pages/workbench/interfaces'
import commands from './commands.json'
import styles from './styles.module.scss'

const options: monacoEditor.editor.IStandaloneEditorConstructionOptions = {
  tabCompletion: 'on',
  wordWrap: 'on',
  padding: { top: 10 },
  automaticLayout: true,
  formatOnPaste: false,
  glyphMargin: true,
  suggest: {
    preview: true,
    showStatusBar: true,
    showIcons: false,
    shareSuggestSelections: false,
    showWords: false,
  },
  lineNumbersMinChars: 4
}

const DEFAULT_COMMANDS = createPureProposals(commands)
const DEFAULT_COMMANDS_LIST = Object.keys(DEFAULT_COMMANDS).map((name) => DEFAULT_COMMANDS[name])
const LIST_OF_INDEXES = [
  'index_1',
  'index_2'
]

const splitQuery = (query: string) => {
  const regex = /"([^"]+)"|(\S+)/g
  const matches = query.match(regex)
  return matches?.map((match) => {
    if (match.startsWith('"') && match.endsWith('"')) {
      return match.slice(1, -1) // Remove the surrounding quotes
    }
    return match
  }) || []
}

const RedisearchPage = () => {
  const [value, setValue] = useState('')

  const monacoObjects = useRef<Nullable<IEditorMount>>(null)
  const disposeCompletionItemProvider = useRef(() => {})

  useEffect(() => {
    monaco.languages.register({ id: 'RediSearch' })
  }, [])

  const onChange = (val: string) => {
    setValue(val)
  }

  const editorDidMount = (
    editor: monacoEditor.editor.IStandaloneCodeEditor,
    monaco: typeof monacoEditor
  ) => {
    monacoObjects.current = { editor, monaco }

    window.monaco = monaco
    window.editor = editor

    const suggestionsList = prepareSuggestions(
      editor.getValue(),
      editor.getModel() as any,
      editor.getPosition() as any
    )

    setupSuggestions(suggestionsList)

    editor.onDidChangeCursorPosition(() => {
      const suggestionsList = prepareSuggestions(
        editor.getValue(),
        editor.getModel() as any,
        editor.getPosition() as any
      )

      if (suggestionsList) {
        setupSuggestions(suggestionsList)
      }
    })
  }

  const setupSuggestions = (suggestions: any[]) => {
    const { monaco, editor } = monacoObjects.current || {}

    if (!monaco) return

    console.log({ suggestions })

    disposeCompletionItemProvider.current?.()
    disposeCompletionItemProvider.current = monaco.languages.registerCompletionItemProvider(
      'RediSearch',
      {
        provideCompletionItems: (
          model: monacoEditor.editor.IModel,
          position: monacoEditor.Position
        ): monacoEditor.languages.CompletionList => ({
          suggestions
        })
      }
    ).dispose

    if (suggestions.length) {
      setTimeout(() => editor?.trigger('', 'editor.action.triggerSuggest', undefined))
    }
  }

  const prepareSuggestions = (
    val: string,
    model: monacoEditor.editor.IModel,
    position: monacoEditor.Position
  ): monacoEditor.languages.CompletionItem[] => {
    const word = model.getWordUntilPosition(position)
    const wordOutsideOffset = {
      left: model.getValueInRange({
        startColumn: word.startColumn - 1,
        endColumn: word.endColumn,
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
      }),
      right: model.getValueInRange({
        startColumn: word.startColumn + 1,
        endColumn: word.endColumn,
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
      })
    }

    console.log({ wordOutsideOffset })
    const line = model.getLineContent(position.lineNumber)

    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      endColumn: word.endColumn,
      startColumn: word.startColumn,
    }

    console.log({ val })

    console.log({ position })

    const [firstArg] = val.split(' ')
    const commandName = firstArg?.toUpperCase()
    const command = commands[commandName]

    console.log({ command })
    console.log({ word })

    if (!command && position.lineNumber === 1 && word.startColumn === 1) {
      return DEFAULT_COMMANDS_LIST.map((command) => ({
        ...command,
        range
      }))
    }

    if (word.word || wordOutsideOffset.left !== ' ' || wordOutsideOffset.right === '"') return []

    const prevLineQuery = line.slice(0, position.column)
    const prevQuery = val
      .split('\n')
      .slice(0, position.lineNumber - 1)
      .concat(prevLineQuery)
      .join('')

    const [, ...prevArgs] = splitQuery(prevQuery)

    console.log({ prevArgs })

    const isCompleteArg = (parent: any, current: any, prev) => {
      // parent?.arguments ? prev.slice(i).length >= parent?.arguments?.filter((a) => !a.optional).length : true
      console.log(current)
      if (current.optional) return true
      // TODO: update mechanism
      if (prev?.length < parent?.arguments?.filter((arg: any) => !arg.optional).length) return false
      if (current.type === 'integer') return false

      return true
    }

    const buildRegex = (args: any[], asString = false) => {
      let currentStringRegex = ''
      args.forEach((arg) => {
        let currentArg = ''

        console.log(arg)
        if (arg.optional) {
          currentArg = `(?:( ${currentArg.trim()}))`
        }

        if (arg.multiple) {
          console.log(currentArg)
          currentArg = `(${currentArg})+`
          console.log(currentArg)
        }

        if (arg.arguments) {
          if (arg.type === 'oneof') {
            currentArg += arg.arguments.map((arg) => arg.token).join('|')
          } else {
            currentArg = buildRegex(arg.arguments, true) as string
          }
        }

        if (arg.token) {
          currentArg += arg.token
        }

        if (arg.type === 'integer' || arg.type === 'string' || arg.type === 'function') {
          currentArg = currentArg ? `${currentArg} (.*)` : '(.*)'
        }

        currentStringRegex += arg.optional ? currentArg : ` ${currentArg}`
      })

      if (asString) return currentStringRegex

      try {
        return new RegExp(currentStringRegex.trim(), 'i')
      } catch {
        return null
      }
    }

    const findArg = (args: any[], prev: string[], parent?: any): any => {
      for (let i = prev.length - 1; i >= 0; i--) {
        const arg = prev[i]

        // TODO: update logic to find multiple args if token
        const currentArg = args.find((cArg) => cArg.name?.toLowerCase() === arg.toLowerCase())
        const token = args.find((cArg) => cArg.token?.toLowerCase() === arg.toLowerCase())

        if (currentArg?.arguments) return findArg(currentArg.arguments, prev.slice(i), currentArg)

        if (token) {
          if (parent) {
            const regex = buildRegex(args) as RegExp

            console.log(token)
            console.log(regex)
            console.log(prev.join(' '))
            console.log(regex?.test(prev.join(' ')))

            return {
              parent,
              currentArg,
              index: i,
              command: prev.slice(i),
              isComplete: regex?.test(prev.join(' '))
            }
          }
          return {
            parent,
            currentArg: token,
            index: i,
            command: prev.slice(i),
            isComplete: prev.slice(i).length >= 2
          }
        }

        if (currentArg) {
          return ({
            parent,
            currentArg,
            index: i,
            command: prev.slice(i),
            isComplete: isCompleteArg(parent, currentArg, prev.slice(i))
          })
        }
      }

      return null
    }

    if (prevArgs.length === 0 && command?.arguments[0].name === 'index') {
      return LIST_OF_INDEXES.map((index) => ({
        label: index,
        kind: monacoEditor.languages.CompletionItemKind.Constant,
        insertText: `${index} "$1" `,
        insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
      }))
    }

    const foundArg = findArg(command?.arguments || [], prevArgs)
    console.log({ foundArg })

    if (!foundArg || foundArg.isComplete) {
      return command.arguments
        .filter((arg) => arg.optional)
        .map((arg) => ({
          label: arg.token || arg.arguments?.[0].token || '',
          kind: monacoEditor.languages.CompletionItemKind.Constant,
          insertText: `${arg.token || arg.name?.toUpperCase() || ''} `,
          insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        }))
    }

    return []
  }

  return (
    <div className={styles.page}>
      <div className={styles.editor}>
        <MonacoEditor
          language="RediSearch"
          theme="dark"
          value={value}
          options={options}
          onChange={onChange}
          editorDidMount={editorDidMount}
        />
      </div>
    </div>
  )
}

export default RedisearchPage
