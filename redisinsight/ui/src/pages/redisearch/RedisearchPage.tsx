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

const RedisearchPage = () => {
  const [value, setValue] = useState('')

  const monacoObjects = useRef<Nullable<IEditorMount>>(null)
  const disposeCompletionItemProvider = useRef(() => {})

  useEffect(() => {
    monaco.languages.register({ id: 'RediSearch' })
  }, [])

  const onChange = (val: string) => {
    setValue(val)
    updateSuggestions(val)
  }

  const updateSuggestions = (val: string) => {
    if (!monacoObjects.current) return

    setupSuggestions(val)
  }

  const editorDidMount = (
    editor: monacoEditor.editor.IStandaloneCodeEditor,
    monaco: typeof monacoEditor
  ) => {
    monacoObjects.current = { editor, monaco }

    window.monaco = monaco
    setupSuggestions()
  }

  const setupSuggestions = (val: string = '') => {
    const monaco = monacoObjects.current?.monaco

    if (!monaco) return

    disposeCompletionItemProvider.current?.()
    disposeCompletionItemProvider.current = monaco.languages.registerCompletionItemProvider(
      'RediSearch',
      {
        provideCompletionItems: (
          model: monacoEditor.editor.IModel,
          position: monacoEditor.Position
        ): monacoEditor.languages.CompletionList => {
          console.log('prepare')
          const suggestions = prepareSuggestions(val, model, position)

          return ({
            suggestions
          })
        }
      }
    ).dispose
  }

  const prepareSuggestions = (
    val: string,
    model: monacoEditor.editor.IModel,
    position: monacoEditor.Position
  ): monacoEditor.languages.CompletionItem[] => {
    const word = model.getWordUntilPosition(position)
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

    if (word.word) return []

    const prevLineQuery = line.slice(0, position.column)
    const [, ...prevArgs] = val
      .split('\n')
      .slice(0, position.lineNumber - 1)
      .concat(prevLineQuery)
      .join('')
      .split(' ')
      .filter(Boolean)

    console.log({ prevArgs })

    const findArg = (args: any[], prev: string[], parent?: any): any => {
      for (let i = prev.length - 1; i >= 0; i--) {
        const arg = prev[i]

        const foundArg = args
          .find((cArg) =>
            cArg.name?.toLowerCase() === arg.toLowerCase() || cArg.token?.toLowerCase() === arg.toLowerCase())

        if (foundArg?.arguments) return findArg(foundArg.arguments, prev.slice(i), foundArg)
        if (foundArg) {
          return ({
            foundArg,
            index: i,
            prev: prev.slice(i),
            isComplete: parent?.arguments ? prev.slice(i).length >= parent?.arguments?.filter((a) => !a.optional).length : true
          })
        }
      }

      return null
    }

    if (prevArgs.length === 0 && command.arguments[0].name === 'index') {
      return LIST_OF_INDEXES.map((index) => ({
        label: index,
        kind: monacoEditor.languages.CompletionItemKind.Constant,
        insertText: `${index} "$1" `,
        insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range
      }))
    }

    const foundArg = findArg(command.arguments, prevArgs)
    console.log({ foundArg })

    if (!foundArg || foundArg.isComplete) {
      return command.arguments.map((arg) => ({
        label: arg.token || arg.name?.toUpperCase() || '',
        kind: monacoEditor.languages.CompletionItemKind.Constant,
        insertText: `${arg.token || arg.name?.toUpperCase() || ''} `,
        insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range
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
