/* eslint-disable no-continue */

import { toNumber } from 'lodash'
import { Maybe } from 'uiSrc/utils'
import { ArgName, SearchCommand, TokenType } from './types'

export const getArgByRest = (
  pastStringArgs: string[],
  pastCommandArgs: SearchCommand[],
  parent: SearchCommand
) => {
  console.log('pastStringArgs', pastStringArgs)
  console.log('pastCommandArgs', pastCommandArgs)
  console.log('parent', parent)

  const getSuggestions = (
    queryArgs: string[],
    restCommandArgs: Maybe<SearchCommand[]> = [],
  ): any => {
    let currentCommandArgIndex = 0
    let isBlockedOnCommand = false
    let multipleIndexStart = 0

    const moveToNextCommandArg = () => currentCommandArgIndex++
    const blockCommand = () => { isBlockedOnCommand = true }
    const unBlockCommand = () => { isBlockedOnCommand = false }

    const skipArg = () => {
      moveToNextCommandArg()
      unBlockCommand()
    }

    console.log('queryArgs', queryArgs)
    console.log('restCommandArgs', restCommandArgs)
    for (let i = 0; i < queryArgs.length; i++) {
      const arg = queryArgs[i]
      const currentCommandArg = restCommandArgs[currentCommandArgIndex]

      console.log(arg, currentCommandArg)

      if (currentCommandArg?.type === TokenType.PureToken) {
        skipArg()
        continue
      }

      // if we are on token - that requires one more argument
      if (currentCommandArg?.token === arg) {
        blockCommand()
        continue
      }

      if (currentCommandArg?.type === TokenType.Block) {
        // if block is multiple - we duplicate nArgs inner arguments
        let blockArguments = currentCommandArg.arguments

        if (currentCommandArg?.multiple) {
          const nArgs = toNumber(queryArgs[i - 1]) || 0
          blockArguments = Array(nArgs).fill(currentCommandArg.arguments).flat()
        }

        return getSuggestions(queryArgs.slice(i), blockArguments)
      }

      if (currentCommandArg?.name === ArgName.NArgs && toNumber(arg) === 0) {
        moveToNextCommandArg()
        skipArg()
        continue
      }

      if (currentCommandArg?.type === TokenType.OneOf && currentCommandArg?.optional) {
        // if oneof is optional then we can switch to another argument
        if (!currentCommandArg?.arguments?.some(({ token }) => token === arg)) {
          moveToNextCommandArg()
        }

        skipArg()
        continue
      }

      if (currentCommandArg?.multiple) {
        const numberOfArgs = toNumber(queryArgs[currentCommandArgIndex]) || 0

        if (!multipleIndexStart) multipleIndexStart = currentCommandArgIndex
        if (i - multipleIndexStart >= numberOfArgs) {
          skipArg()
          continue
        }

        console.log('BLOCK MULTIPLE')
        blockCommand()
        continue
      }

      moveToNextCommandArg()
      isBlockedOnCommand = !!restCommandArgs[currentCommandArgIndex + 1]
      console.log(isBlockedOnCommand)
    }

    return {
      restArguments: restCommandArgs,
      stopArgIndex: currentCommandArgIndex,
      isBlocked: isBlockedOnCommand
    }
  }

  const {
    restArguments,
    stopArgIndex,
    isBlocked
  } = getSuggestions(pastStringArgs, pastCommandArgs)

  const stopArgument = restArguments[stopArgIndex]
  console.log(stopArgument)

  const restNotFilledArgs: SearchCommand[] = restArguments.slice(stopArgIndex)
  const restOptionalSuggestions = [...restNotFilledArgs, parent]
    .filter((a) => a?.optional && (a.token || a.type === TokenType.Block))
  const isOneOfArgument = stopArgument?.type === TokenType.OneOf
  const isArgSuggestions = stopArgument && (stopArgument?.token || isOneOfArgument)

  const suggestions = isArgSuggestions
    // only 1 suggestion since next arg is required
    ? [isOneOfArgument ? stopArgument.arguments : stopArgument].flat()
    : !isBlocked
      ? restOptionalSuggestions
      : []

  console.log(suggestions)

  const requiredArgsLength = restNotFilledArgs.filter((arg) => !arg.optional).length

  return {
    isComplete: requiredArgsLength === 0 && !isBlocked,
    stopArg: stopArgument,
    isBlocked: isBlocked && !(isOneOfArgument && stopArgument.optional),
    append: suggestions,
  }
}

export const findArg = (list: any[], arg: string) =>
  list.find((cArg) =>
    (cArg.type === TokenType.OneOf ? false : cArg.arguments?.[0]?.token?.toLowerCase() === arg.toLowerCase()))

export const isCompositeArgument = (arg: string, prevArg?: string) => arg === '*' && prevArg === 'LOAD'
