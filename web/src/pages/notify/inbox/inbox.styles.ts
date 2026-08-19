import { createStyles } from 'antd-style';

export const useInboxStyles = createStyles(({ token }) => ({
  page: {
    display: 'flex',
    minHeight: 0,
    flexDirection: 'column',
    gap: token.marginLG,
  },
  pageHeading: {
    marginBlock: 0,
  },
  shell: {
    display: 'grid',
    minHeight: token.controlHeight * 14,
    gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 3fr)',
    overflow: 'hidden',
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorBgContainer,
    [`@media (max-width: ${token.screenMD}px)`]: {
      gridTemplateColumns: 'minmax(0, 1fr)',
    },
  },
  listPane: {
    display: 'flex',
    minWidth: 0,
    minHeight: 0,
    flexDirection: 'column',
    borderInlineEnd: `1px solid ${token.colorBorderSecondary}`,
    [`@media (max-width: ${token.screenMD}px)`]: {
      borderInlineEnd: 0,
      borderBlockEnd: `1px solid ${token.colorBorderSecondary}`,
    },
  },
  listHeader: {
    paddingInline: token.padding,
    borderBlockEnd: `1px solid ${token.colorBorderSecondary}`,
  },
  alert: {
    margin: token.marginSM,
  },
  loading: {
    padding: token.paddingLG,
  },
  messageList: {
    flex: 1,
    minHeight: 0,
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  listItem: {
    padding: 0,
    borderBlockEnd: `1px solid ${token.colorBorderSecondary}`,
  },
  messageButton: {
    width: '100%',
    minWidth: 0,
    padding: `${token.paddingSM}px ${token.padding}px`,
    border: 0,
    background: 'transparent',
    color: token.colorText,
    cursor: 'pointer',
    textAlign: 'start',
    transition: `background-color ${token.motionDurationFast}`,
    '&:hover': {
      background: token.colorFillTertiary,
    },
    '&:focus-visible': {
      outline: `${token.lineWidthFocus}px solid ${token.colorPrimaryBorder}`,
      outlineOffset: -token.lineWidthFocus,
    },
    '&[aria-current="true"]': {
      background: token.colorPrimaryBg,
    },
  },
  messageRow: {
    display: 'flex',
    minWidth: 0,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: token.marginSM,
  },
  messageCopy: {
    minWidth: 0,
  },
  messageTitle: {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  unreadTitle: {
    fontWeight: token.fontWeightStrong,
  },
  messageTime: {
    display: 'block',
    marginBlockStart: token.marginXXS,
  },
  statusTag: {
    flexShrink: 0,
    marginInlineEnd: 0,
  },
  pagination: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: token.paddingSM,
    borderBlockStart: `1px solid ${token.colorBorderSecondary}`,
  },
  empty: {
    display: 'grid',
    minHeight: token.controlHeight * 8,
    placeItems: 'center',
    padding: token.paddingLG,
  },
  detailPane: {
    minWidth: 0,
    padding: token.paddingLG,
  },
  detailHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: token.marginMD,
    paddingBlockEnd: token.padding,
    borderBlockEnd: `1px solid ${token.colorBorderSecondary}`,
  },
  detailActions: {
    display: 'flex',
    flexShrink: 0,
    alignItems: 'center',
    gap: token.marginXS,
  },
  detailTitle: {
    marginBlock: 0,
    overflowWrap: 'anywhere',
  },
  detailMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: token.marginXS,
    marginBlockStart: token.marginXS,
  },
  detailContent: {
    maxInlineSize: '65ch',
    marginBlock: token.marginLG,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  },
}));
