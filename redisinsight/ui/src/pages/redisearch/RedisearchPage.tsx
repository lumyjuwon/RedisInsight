import React, { useEffect, useRef, useState } from 'react'
import MonacoEditor, { monaco } from 'react-monaco-editor'
import * as monacoEditor from 'monaco-editor'
import { createPureProposals, Nullable } from 'uiSrc/utils'
import { IEditorMount } from 'uiSrc/pages/workbench/interfaces'
import { getArgByRest } from 'uiSrc/pages/redisearch/utils'
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
    const suggestionsList = prepareSuggestions(editor)

    setupSuggestions(suggestionsList)

    // TODO: for testing - we show suggestion on each change cursor position
    // hope it will be changed
    editor.onDidChangeCursorPosition(() => {
      const suggestionsList = prepareSuggestions(editor)

      if (suggestionsList) {
        setupSuggestions(suggestionsList)
      }
    })
  }

  const setupSuggestions = (suggestions: any[]) => {
    const { monaco, editor } = monacoObjects.current || {}
    if (!monaco) return

    disposeCompletionItemProvider.current?.()
    disposeCompletionItemProvider.current = monaco.languages.registerCompletionItemProvider(
      'RediSearch',
      {
        provideCompletionItems: (): monacoEditor.languages.CompletionList => ({ suggestions })
      }
    ).dispose

    if (suggestions.length) {
      setTimeout(() => editor?.trigger('', 'editor.action.triggerSuggest', undefined))
    }
  }

  const buildSuggestion = (arg: any, range: any, sortText?: string) => ({
    label: arg.token || arg.arguments?.[0].token || '',
    kind: monacoEditor.languages.CompletionItemKind.Constant,
    insertText: `${arg.token || arg.arguments?.[0].token || arg.name?.toUpperCase() || ''} `,
    insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range,
    sortText
  })

  const prepareSuggestions = (
    editor: monacoEditor.editor.IStandaloneCodeEditor
  ): monacoEditor.languages.CompletionItem[] => {
    const value = editor.getValue()
    const position = editor.getPosition()
    const model = editor.getModel()

    if (!position || !model) return []

    const word = model?.getWordUntilPosition(position)
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

    // TODO: when cursor is before argument first letter comes to args
    const line = model.getLineContent(position.lineNumber)

    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      endColumn: word.endColumn,
      startColumn: word.startColumn,
    }

    const [firstArg] = value.split(' ')
    const commandName = firstArg?.toUpperCase()
    const command = commands[commandName]

    if (!command && position.lineNumber === 1 && word.startColumn === 1) {
      return DEFAULT_COMMANDS_LIST.map((command) => ({
        ...command,
        range
      }))
    }

    // TODO: check this when we don't need to suggest
    if (word.word || wordOutsideOffset.left !== ' ' || wordOutsideOffset.right) return []

    const prevLineQuery = line.slice(0, position.column)
    const prevQuery = value
      .split('\n')
      .slice(0, position.lineNumber - 1)
      .concat(prevLineQuery)
      .join('')

    const [, ...prevArgs] = splitQuery(prevQuery)

    const findArg = (args: any[], prev: string[], parent?: any): any => {
      for (let i = prev.length - 1; i >= 0; i--) {
        const arg = prev[i]
        const currentArg = args.find((cArg) => cArg.arguments?.[0]?.token?.toLowerCase() === arg.toLowerCase() || cArg.name?.toLowerCase() === arg.toLowerCase())
        if (currentArg?.arguments) return findArg(currentArg.arguments, prev.slice(i), currentArg)

        const tokenIndex = args.findIndex((cArg) => cArg.token?.toLowerCase() === arg.toLowerCase())
        const token = args[tokenIndex]

        if (token) {
          const pastArgs = prev.slice(i)
          const commandArgs = parent ? args.slice(tokenIndex, args.length) : [token]

          // getArgByRest - here we preparing the list of arguments which can be inserted,
          // this is the main function which suggest arguments
          return getArgByRest(pastArgs, commandArgs)
        }
      }

      return null
    }

    // just suggest indexes - in future get from BE
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

    // here we suggest arguments of argument
    if (foundArg && !foundArg.isComplete) {
      if (foundArg.isBlocked) return []
      if (foundArg.append?.length) return foundArg.append.map((arg: any) => buildSuggestion(arg, range))
      return []
    }

    // the main list of arguments + optional from argument
    // TODO: remove arguments which already used if they are not multiple
    if (!foundArg || foundArg.isComplete) {
      // here we can add append arguments
      const appendCommands = foundArg?.append ?? []
      return [
        ...appendCommands
          .map((arg: any) => buildSuggestion(arg, range, 'a')),
        ...command.arguments
          .filter((arg: any) => arg.optional)
          .map((arg: any) => buildSuggestion(arg, range, 'b'))
      ]
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
