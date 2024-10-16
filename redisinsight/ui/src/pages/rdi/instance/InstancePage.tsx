import React, { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useHistory, useLocation, useParams } from 'react-router-dom'
import { Formik, FormikProps } from 'formik'

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui'
import {
  appContextSelector,
  resetDatabaseContext,
  resetRdiContext,
  setAppContextConnectedRdiInstanceId,
  setPipelineDialogState,
} from 'uiSrc/slices/app/context'
import { IRoute, PageNames, Pages } from 'uiSrc/constants'
import { fetchConnectedInstanceAction } from 'uiSrc/slices/rdi/instances'
import {
  resetConnectedInstance as resetConnectedDatabaseInstance,
} from 'uiSrc/slices/instances/instances'
import {
  deployPipelineAction,
  getPipelineStatusAction,
  rdiPipelineSelector,
  resetPipelineAction,
  resetPipelineChecked,
  setPipelineInitialState,
} from 'uiSrc/slices/rdi/pipeline'
import { IActionPipelineResultProps, IPipeline } from 'uiSrc/slices/interfaces'
import { createAxiosError, Nullable, pipelineToJson } from 'uiSrc/utils'
import { rdiErrorMessages } from 'uiSrc/pages/rdi/constants'
import { addErrorNotification } from 'uiSrc/slices/app/notifications'

import { RdiInstancePageTemplate } from 'uiSrc/templates'
import { RdiInstanceHeader } from 'uiSrc/components'
import { TelemetryEvent, sendEventTelemetry } from 'uiSrc/telemetry'
import InstancePageRouter from './InstancePageRouter'
import { ConfirmLeavePagePopup, RdiPipelineHeader } from './components'
import { useUndeployedChangesPrompt } from './hooks'
import styles from './styles.module.scss'

export interface Props {
  routes: IRoute[]
}

const getInitialValues = (data: Nullable<IPipeline>): IPipeline => ({
  config: data?.config ?? '',
  jobs: data?.jobs ?? [],
})

const RdiInstancePage = ({ routes = [] }: Props) => {
  const dispatch = useDispatch()
  const history = useHistory()
  const { pathname } = useLocation()

  const { rdiInstanceId } = useParams<{ rdiInstanceId: string }>()
  const { lastPage, contextRdiInstanceId } = useSelector(appContextSelector)
  const { data, resetChecked } = useSelector(rdiPipelineSelector)
  const { showModal, handleCloseModal, handleConfirmLeave } = useUndeployedChangesPrompt()

  const [initialFormValues, setInitialFormValues] = useState<IPipeline>(getInitialValues(data))
  const formikRef = useRef<FormikProps<IPipeline>>(null)

  useEffect(() => {
    if (!contextRdiInstanceId || contextRdiInstanceId !== rdiInstanceId) {
      dispatch(resetRdiContext())
      dispatch(fetchConnectedInstanceAction(rdiInstanceId))
    }
    dispatch(setAppContextConnectedRdiInstanceId(rdiInstanceId))

    // clear database context
    dispatch(resetConnectedDatabaseInstance())
    dispatch(resetDatabaseContext())
  }, [rdiInstanceId])

  useEffect(() => {
    // redirect only if there is no exact path
    if (pathname === Pages.rdiPipeline(rdiInstanceId)) {
      if (lastPage === PageNames.rdiStatistics && contextRdiInstanceId === rdiInstanceId) {
        history.push(Pages.rdiStatistics(rdiInstanceId))
        return
      }
      history.push(Pages.rdiPipelineManagement(rdiInstanceId))
    }
  }, [])

  useEffect(() => {
    setInitialFormValues(getInitialValues(data))
    formikRef.current?.resetForm()
  }, [data])

  // set initial values
  useEffect(() => () => {
    dispatch(setPipelineInitialState())
    dispatch(setPipelineDialogState(true))
  }, [])

  const actionPipelineCallback = (event: TelemetryEvent, result: IActionPipelineResultProps) => {
    sendEventTelemetry({
      event,
      eventData: {
        id: rdiInstanceId,
        ...result,
      }
    })
    dispatch(getPipelineStatusAction(rdiInstanceId))
  }

  const updatePipelineStatus = () => {
    if (resetChecked) {
      dispatch(resetPipelineChecked(false))
      dispatch(resetPipelineAction(rdiInstanceId,
        (result: IActionPipelineResultProps) => actionPipelineCallback(TelemetryEvent.RDI_PIPELINE_RESET, result),
        (result: IActionPipelineResultProps) => actionPipelineCallback(TelemetryEvent.RDI_PIPELINE_RESET, result)))
    } else {
      dispatch(getPipelineStatusAction(rdiInstanceId))
    }
  }

  const onSubmit = (values: IPipeline) => {
    const JSONValues = pipelineToJson(values, (errors) => {
      dispatch(addErrorNotification(createAxiosError({
        message: rdiErrorMessages.invalidStructure(errors[0].filename, errors[0].msg)
      })))
    })
    if (!JSONValues) {
      return
    }
    dispatch(deployPipelineAction(rdiInstanceId, JSONValues, updatePipelineStatus,
      () => dispatch(getPipelineStatusAction(rdiInstanceId))),)
  }

  return (
    <Formik
      initialValues={initialFormValues}
      enableReinitialize
      onSubmit={onSubmit}
      innerRef={formikRef}
    >
      <>
        <EuiFlexGroup className={styles.page} direction="column" gutterSize="none" responsive={false}>
          <EuiFlexItem grow={false}>
            <RdiInstanceHeader />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <RdiPipelineHeader />
          </EuiFlexItem>
          <RdiInstancePageTemplate>
            <InstancePageRouter routes={routes} />
            {showModal && <ConfirmLeavePagePopup onClose={handleCloseModal} onConfirm={handleConfirmLeave} />}
          </RdiInstancePageTemplate>
        </EuiFlexGroup>
      </>
    </Formik>
  )
}

export default RdiInstancePage
