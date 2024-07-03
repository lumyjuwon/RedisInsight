/* eslint-disable no-continue */

export const getArgByRest = (pastStringArgs: string[], pastCommandArgs: any[]) => {
  console.log({ pastStringArgs })
  console.log({ pastCommandArgs })

  let currentCommandArgIndex = 0
  let isBlockedOnCommand = false

  const moveToNextCommandArg = () => currentCommandArgIndex++
  const blockCommand = () => { isBlockedOnCommand = true }
  const unBlockCommand = () => { isBlockedOnCommand = false }

  for (let i = 0; i < pastStringArgs.length; i++) {
    const currentArg = pastStringArgs[i]
    const currentCommandArg = pastCommandArgs[currentCommandArgIndex]
    console.log(currentArg, currentCommandArg)

    // if pure-token just move
    if (currentCommandArg?.type === 'pure-token') {
      moveToNextCommandArg()
      unBlockCommand()
      continue
    }

    // if we are on token - that requires one more argument
    if (currentCommandArg?.token === currentArg) {
      blockCommand()
      continue
    }

    // we found arg on token, just move
    if (currentCommandArg?.token) {
      moveToNextCommandArg()
      unBlockCommand()
      continue
    }

    if (currentCommandArg?.type === 'block') {
      // TODO: cover blocks
      blockCommand()
      moveToNextCommandArg()
    }

    moveToNextCommandArg()
  }

  const rest = pastCommandArgs.slice(currentCommandArgIndex)
  const stopCommand = pastCommandArgs[currentCommandArgIndex]

  console.log(rest)
  console.log(stopCommand)

  const isRestMandatory = rest.filter((arg) => !arg?.optional).length > 0 || stopCommand?.token

  // isComplete = we completed argument, no need to suggest arguments
  // append = arguments to suggest
  // isBlocked = we cannot suggest, we are on argument which is required and it is not token

  return {
    isComplete: rest.length === 0 || !isRestMandatory,
    append: rest,
    isBlocked: isBlockedOnCommand || !stopCommand?.optional
  }
}
