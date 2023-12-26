import React, { useContext } from 'react'
import { useDispatch } from 'react-redux'
import { useHistory, useParams } from 'react-router-dom'
import {
  EuiButton,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiAccordion,
  EuiToolTip,
  EuiIcon,
  EuiButtonIcon,
} from '@elastic/eui'
import { isUndefined } from 'lodash'
import cx from 'classnames'

import { Nullable, Maybe } from 'uiSrc/utils'
import { renderRecommendationContent } from 'uiSrc/utils/recommendation/utils'
import { Theme } from 'uiSrc/constants'
import { RecommendationVoting, RecommendationCopyComponent } from 'uiSrc/components'
import { Vote } from 'uiSrc/constants/recommendations'
import { sendEventTelemetry, TelemetryEvent } from 'uiSrc/telemetry'
import { ThemeContext } from 'uiSrc/contexts/themeContext'
import { deleteLiveRecommendations, updateLiveRecommendation } from 'uiSrc/slices/recommendations/recommendations'
import { EXTERNAL_LINKS } from 'uiSrc/constants/links'
import { IRecommendationsStatic, IRecommendationParams } from 'uiSrc/slices/interfaces/recommendations'

import RediStackDarkMin from 'uiSrc/assets/img/modules/redistack/RediStackDark-min.svg'
import RediStackLightMin from 'uiSrc/assets/img/modules/redistack/RediStackLight-min.svg'
import { ReactComponent as SnoozeIcon } from 'uiSrc/assets/img/icons/snooze.svg'
import { ReactComponent as StarsIcon } from 'uiSrc/assets/img/icons/stars.svg'

import { openTutorialByPath } from 'uiSrc/slices/panels/insights'
import styles from './styles.module.scss'

export interface IProps {
  id: string
  name: string
  isRead: boolean
  vote: Nullable<Vote>
  hide: boolean
  tutorial?: string
  provider?: string
  params: IRecommendationParams
  recommendationsContent: IRecommendationsStatic
}

const Recommendation = ({
  id,
  name,
  isRead,
  vote,
  tutorial,
  hide,
  provider,
  params,
  recommendationsContent,
}: IProps) => {
  const history = useHistory()
  const dispatch = useDispatch()
  const { theme } = useContext(ThemeContext)
  const { instanceId = '' } = useParams<{ instanceId: string }>()

  const { redisStack, title, liveTitle, content = [] } = recommendationsContent[name]
    || {}

  const recommendationTitle = liveTitle || title

  const handleRedirect = () => {
    sendEventTelemetry({
      event: TelemetryEvent.INSIGHTS_RECOMMENDATION_TUTORIAL_CLICKED,
      eventData: {
        databaseId: instanceId,
        name: recommendationsContent[name].telemetryEvent || name,
        provider
      }
    })

    dispatch(openTutorialByPath(tutorial || '', history))
  }

  const toggleHide = (event: React.MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()
    dispatch(
      updateLiveRecommendation(
        id,
        { hide: !hide },
        ({ hide, name }) => sendEventTelemetry({
          event: TelemetryEvent.INSIGHTS_RECOMMENDATION_HIDE,
          eventData: {
            databaseId: instanceId,
            action: hide ? 'hide' : 'show',
            name: recommendationsContent[name]?.telemetryEvent ?? name,
            provider
          }
        })
      )
    )
  }

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()
    dispatch(
      deleteLiveRecommendations(
        [{ id, isRead }],
        onSuccessActionDelete
      )
    )
  }

  const onSuccessActionDelete = () => {
    sendEventTelemetry({
      event: TelemetryEvent.INSIGHTS_RECOMMENDATION_SNOOZED,
      eventData: {
        databaseId: instanceId,
        name: recommendationsContent[name]?.telemetryEvent ?? name,
        provider
      }
    })
  }

  const onRecommendationLinkClick = () => {
    sendEventTelemetry({
      event: TelemetryEvent.INSIGHTS_RECOMMENDATION_LINK_CLICKED,
      eventData: {
        databaseId: instanceId,
        name: recommendationsContent[name]?.telemetryEvent ?? name,
        provider
      }
    })
  }

  const recommendationContent = () => (
    <EuiText>
      {!isUndefined(tutorial) && (
        <EuiButton
          fill
          iconType={StarsIcon}
          iconSide="right"
          className={styles.btn}
          onClick={handleRedirect}
          color="secondary"
          data-testid={`${name}-to-tutorial-btn`}
        >
          { tutorial ? 'Start Tutorial' : 'Workbench' }
        </EuiButton>
      )}
      {renderRecommendationContent(
        content,
        params,
        {
          onClickLink: onRecommendationLinkClick,
          telemetryName: recommendationsContent[name]?.telemetryEvent ?? name,
        },
        true
      )}
      {!!params?.keys?.length && (
        <RecommendationCopyComponent
          keyName={params.keys[0]}
          provider={provider}
          telemetryEvent={recommendationsContent[name]?.telemetryEvent ?? name}
          live
        />
      )}
      <div className={styles.actions}>
        <RecommendationVoting live id={id} vote={vote} name={name} containerClass={styles.votingContainer} />
      </div>
    </EuiText>
  )

  const renderButtonContent = (redisStack: Maybe<boolean>, title: string, id: string) => (
    <EuiFlexGroup
      className={styles.fullWidth}
      responsive={false}
      alignItems="center"
      justifyContent="spaceBetween"
      gutterSize="none"
    >
      <EuiFlexGroup className={styles.fullWidth} alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          {redisStack && (
            <EuiLink
              external={false}
              target="_blank"
              href={EXTERNAL_LINKS.redisStack}
              className={styles.redisStackLink}
              data-testid={`${id}-redis-stack-link`}
            >
              <EuiToolTip
                content="Redis Stack"
                position="top"
                display="inlineBlock"
                anchorClassName="flex-row"
              >
                <EuiIcon
                  type={theme === Theme.Dark ? RediStackDarkMin : RediStackLightMin}
                  className={styles.redisStackIcon}
                  data-testid={`${id}-redis-stack-icon`}
                />
              </EuiToolTip>
            </EuiLink>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow className="truncateText">
          {title}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            title="Snooze recommendation"
            content="This recommendation will be removed from the list and displayed again when relevant."
            position="top"
            display="inlineBlock"
            anchorClassName="flex-row"
          >
            <EuiButtonIcon
              href="#"
              iconType={SnoozeIcon}
              className={styles.snoozeBtn}
              onClick={handleDelete}
              aria-label="snooze recommendation"
              data-testid={`${name}-delete-btn`}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            title={`${hide ? 'Show' : 'Hide'} recommendation`}
            content={`${hide
              ? 'This recommendation will be shown in the list.'
              : 'This recommendation will be removed from the list and not displayed again.'
            }`}
            position="top"
            display="inlineBlock"
            anchorClassName="flex-row"
          >
            <EuiButtonIcon
              href="#"
              iconType={hide ? 'eyeClosed' : 'eye'}
              className={styles.hideBtn}
              onClick={toggleHide}
              aria-label="hide/unhide recommendation"
              data-testid={`toggle-hide-${name}-btn`}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  )

  if (!(name in recommendationsContent)) {
    return null
  }

  return (
    <div
      className={cx(styles.recommendationAccordion, { [styles.read]: isRead })}
      data-testid={`${name}-recommendation`}
    >
      <EuiAccordion
        id={name}
        initialIsOpen={!isRead}
        arrowDisplay="right"
        buttonContent={renderButtonContent(redisStack, recommendationTitle, name)}
        buttonClassName={styles.accordionBtn}
        buttonProps={{ 'data-test-subj': `${name}-button` }}
        className={styles.accordion}
        data-testid={`${name}-accordion`}
        aria-label={`${name}-accordion`}
      >
        <EuiPanel className={styles.accordionContent} color="subdued">
          {recommendationContent()}
        </EuiPanel>
      </EuiAccordion>
    </div>
  )
}

export default Recommendation
