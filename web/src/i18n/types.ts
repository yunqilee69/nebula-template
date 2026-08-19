/**
 * Internationalization resource type definitions.
 * 
 * - NebulaLocale: Supported language identifiers
 * - Nebula*Messages: Message shapes for each business domain
 * - NebulaMessages: Root message structure aggregating all domains
 * - NebulaMessageKey: Type-safe dot-notation paths (e.g., 'auth.roleManagement.title')
 */
export type NebulaLocale = 'zh-CN' | 'en-US';

export interface NebulaCommonMessages {
  languageZh: string;
  languageEn: string;
  empty: {
    noModules: string;
  };
  actions: {
    confirm: string;
    cancel: string;
  };
  pagination: {
    total: string;
  };
}

export interface NebulaTabContextMenuMessages {
  refresh: string;
  closeCurrent: string;
  closeLeft: string;
  closeRight: string;
  closeOthers: string;
  openInNewWindow: string;
  ariaLabel: string;
}

export interface NebulaHeaderUserMessages {
  anonymous: string;
  menuAriaLabel: string;
  profile: string;
  preferences: string;
  logout: string;
  preferencesTitle: string;
  themeLabel: string;
  languageLabel: string;
  light: string;
  dark: string;
  zhCN: string;
  enUS: string;
  save: string;
  cancel: string;
  profilePlaceholder: string;
}

export interface NebulaLayoutMessages {
  sidebarCollapse: string;
  sidebarExpand: string;
  breadcrumbAriaLabel: string;
  sidebarAriaLabel: string;
  tabContextMenu: NebulaTabContextMenuMessages;
  headerUser: NebulaHeaderUserMessages;
  notificationInbox: string;
  tabRenameAriaLabel: string;
  tabReorderHandleAriaLabel: string;
}

export interface NebulaRoleManagementMessages {
  title: string;
  unconfiguredTitle: string;
  unconfiguredDescription: string;
  actions: {
    create: string;
    edit: string;
    delete: string;
    addUsers: string;
    removeUsers: string;
    moreActions: string;
    search: string;
    reset: string;
    save: string;
    cancel: string;
  };
  columns: {
    name: string;
    code: string;
    status: string;
    createTime: string;
    updateTime: string;
    actions: string;
  };
  fields: {
    name: string;
    code: string;
    status: string;
    description: string;
  };
  modal: {
    createTitle: string;
    editTitle: string;
  };
  addUsers: {
    title: string;
  };
  tree: {
    title: string;
    searchPlaceholder: string;
    totalRoles: string;
  };
  placeholders: {
    name: string;
    code: string;
    status: string;
    formName: string;
    formCode: string;
    description: string;
  };
  validation: {
    nameRequired: string;
    nameLength: string;
    codeRequired: string;
    codeLength: string;
    statusRequired: string;
  };
  status: {
    enabled: string;
    disabled: string;
  };
  feedback: {
    listLoadFailed: string;
    userListLoadFailed: string;
    detailLoadFailed: string;
    createSuccess: string;
    updateSuccess: string;
    deleteSuccess: string;
  };
  confirm: {
    deleteTitle: string;
    unbindUsersTitle: string;
  };
}

export interface NebulaMenuManagementMessages {
  title: string;
  unconfiguredTitle: string;
  unconfiguredDescription: string;
  actions: {
    create: string;
    edit: string;
    delete: string;
    manageButtons: string;
    createButton: string;
    search: string;
    reset: string;
    save: string;
    cancel: string;
  };
  columns: {
    name: string;
    code: string;
    type: string;
    path: string;
    sort: string;
    status: string;
    createTime: string;
    updateTime: string;
    actions: string;
  };
  fields: {
    parentId: string;
    rootMenu: string;
    name: string;
    code: string;
    type: string;
    path: string;
    icon: string;
    component: string;
    sort: string;
    status: string;
    hidden: string;
    externalUrl: string;
    visibleInBreadcrumb: string;
    visibleInTab: string;
    activeMenuPath: string;
    remark: string;
    buttonName: string;
    buttonCode: string;
    buttonType: string;
  };
  modal: {
    createTitle: string;
    editTitle: string;
    buttonTitle: string;
    createButtonTitle: string;
    editButtonTitle: string;
  };
  placeholders: {
    name: string;
    code: string;
    type: string;
    path: string;
    icon: string;
    component: string;
    status: string;
    parentId: string;
    externalUrl: string;
    remark: string;
    buttonName: string;
    buttonCode: string;
    buttonType: string;
  };
  validation: {
    nameRequired: string;
    nameLength: string;
    codeRequired: string;
    codeLength: string;
    pathRequired: string;
    externalUrlRequired: string;
    externalUrlFormat: string;
    typeRequired: string;
    statusRequired: string;
    buttonNameRequired: string;
    buttonCodeRequired: string;
  };
  types: {
    catalog: string;
    menu: string;
    iframe: string;
    external: string;
  };
  buttonTypes: {
    add: string;
    edit: string;
    delete: string;
    export: string;
  };
  status: {
    enabled: string;
    disabled: string;
  };
  feedback: {
    listLoadFailed: string;
    detailLoadFailed: string;
    createSuccess: string;
    updateSuccess: string;
    deleteSuccess: string;
    buttonListLoadFailed: string;
    buttonDetailLoadFailed: string;
    buttonCreateSuccess: string;
    buttonUpdateSuccess: string;
    buttonDeleteSuccess: string;
  };
  confirm: {
    deleteTitle: string;
    buttonDeleteTitle: string;
  };
}

export interface NebulaUserManagementMessages {
  title: string;
  actions: {
    create: string;
    edit: string;
    delete: string;
    resetPassword: string;
    search: string;
    reset: string;
    save: string;
    cancel: string;
  };
  columns: {
    username: string;
    nickname: string;
    status: string;
    role: string;
    org: string;
    actions: string;
  };
  fields: {
    username: string;
    password: string;
    nickname: string;
    email: string;
    phone: string;
    roles: string;
    orgs: string;
    status: string;
  };
  modal: {
    createTitle: string;
    editTitle: string;
  };
  placeholders: {
    username: string;
    password: string;
    nickname: string;
    email: string;
    phone: string;
    roles: string;
    orgs: string;
    status: string;
  };
  validation: {
    usernameRequired: string;
    passwordRequired: string;
  };
  status: {
    enabled: string;
    disabled: string;
  };
  feedback: {
    optionsLoadFailed: string;
    detailLoadFailed: string;
    createSuccess: string;
    updateSuccess: string;
    resetPasswordSuccess: string;
    createFailed: string;
    updateFailed: string;
    resetPasswordFailed: string;
  };
  confirm: {
    deleteTitle: string;
    resetPasswordTitle: string;
  };
}

export interface NebulaOrgManagementMessages {
  title: string;
  actions: {
    create: string;
    edit: string;
    rename: string;
    delete: string;
    move: string;
    moreActions: string;
    addUsers: string;
    search: string;
    reset: string;
    save: string;
    cancel: string;
  };
  columns: {
    name: string;
    code: string;
    type: string;
    status: string;
    actions: string;
  };
  fields: {
    name: string;
    code: string;
    parentId: string;
    type: string;
    status: string;
  };
  modal: {
    createTitle: string;
    editTitle: string;
  };
  moveOrg: {
    title: string;
    selectParent: string;
    placeholder: string;
  };
  addUsers: {
    title: string;
  };
  placeholders: {
    name: string;
    code: string;
    parentId: string;
    type: string;
    status: string;
  };
  validation: {
    nameRequired: string;
    codeRequired: string;
    typeRequired: string;
  };
  types: {
    company: string;
    department: string;
    team: string;
  };
  status: {
    enabled: string;
    disabled: string;
  };
  tree: {
    title: string;
    searchPlaceholder: string;
    rootCount: string;
  };
  feedback: {
    treeLoadFailed: string;
    listLoadFailed: string;
    refreshFailed: string;
    detailLoadFailed: string;
    createSuccess: string;
    updateSuccess: string;
    deleteSuccess: string;
    moveSuccess: string;
    addUsersSuccess: string;
    createFailed: string;
    updateFailed: string;
    deleteFailed: string;
    moveFailed: string;
    addUsersFailed: string;
  };
}

export interface NebulaAssignmentMessages {
  title: string;
  selectedUsers: string;
  tabs: {
    organizations: string;
    orgUsers: string;
    childOrgs: string;
    unassignedOrgUsers: string;
    roles: string;
    globalRoleUsers: string;
    unassignedRoleUsers: string;
  };
  actions: {
    batchAssign: string;
    setRoles: string;
    setOrgs: string;
    assign: string;
  };
  fields: {
    roles: string;
    orgs: string;
  };
  placeholders: {
    roles: string;
    orgs: string;
  };
  hints: {
    noRoleChange: string;
    noOrgChange: string;
  };
  validation: {
    rolesRequired: string;
  };
  feedback: {
    success: string;
    failed: string;
    removeSuccess: string;
    removeFailed: string;
  };
}

export interface NebulaPermissionConfigMessages {
  title: string;
  subjectsTitle: string;
  resourcesTitle: string;
  tabs: {
    org: string;
    role: string;
    user: string;
  };
  search: {
    subjectAriaLabel: string;
    subjectPlaceholder: string;
    resourceAriaLabel: string;
    resourcePlaceholder: string;
  };
  orgListTitle: string;
  empty: {
    orgs: string;
    subjects: string;
    resources: string;
  };
  effects: {
    none: string;
    allow: string;
    deny: string;
    ariaLabel: string;
  };
  actions: {
    save: string;
    bulkNone: string;
    bulkAllow: string;
  };
  feedback: {
    loadFailed: string;
    saveSuccess: string;
  };
}

export interface NebulaProfileInfoMessages {
  title: string;
  sections: {
    basic: string;
    password: string;
    oauth2: string;
    loginRecords: string;
  };
  actions: {
    save: string;
    changePassword: string;
    refresh: string;
    bind: string;
    unbind: string;
    uploadAvatar: string;
  };
  fields: {
    username: string;
    accountName: string;
    displayName: string;
    nickname: string;
    avatar: string;
    email: string;
    phone: string;
    status: string;
    createTime: string;
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
  columns: {
    loginType: string;
    loginIp: string;
    deviceInfo: string;
    loginTime: string;
    success: string;
    failReason: string;
  };
  placeholders: {
    nickname: string;
    email: string;
    phone: string;
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
  validation: {
    email: string;
    phone: string;
    oldPasswordRequired: string;
    newPasswordRequired: string;
    confirmPasswordRequired: string;
    passwordMismatch: string;
  };
  status: {
    enabled: string;
    disabled: string;
    bound: string;
    unbound: string;
    success: string;
    failed: string;
  };
  empty: {
    oauth2: string;
    loginRecords: string;
    notProvided: string;
  };
  hints: {
    avatarUpload: string;
  };
  confirm: {
    unbindTitle: string;
    takeoverTitle: string;
    takeoverContent: string;
  };
  feedback: {
    profileLoadFailed: string;
    profileUpdateSuccess: string;
    profileUpdateFailed: string;
    avatarUploadFailed: string;
    passwordChangeSuccess: string;
    passwordChangeFailed: string;
    oauth2LoadFailed: string;
    bindUnavailable: string;
    bindSuccess: string;
    bindFailed: string;
    unbindSuccess: string;
    unbindFailed: string;
    loginRecordsLoadFailed: string;
  };
  bindCallback: {
    loading: string;
    confirming: string;
    successTitle: string;
    successMessage: string;
    errorTitle: string;
    missingParams: string;
    providerError: string;
    failed: string;
    cancelled: string;
    retryBind: string;
    backToProfile: string;
  };
}

export interface NebulaButtonManagementMessages {
  title: string;
  actions: {
    create: string;
    edit: string;
    delete: string;
    search: string;
    reset: string;
    save: string;
    cancel: string;
  };
  columns: {
    name: string;
    code: string;
    status: string;
    createTime: string;
    updateTime: string;
    actions: string;
  };
  fields: {
    name: string;
    code: string;
    type: string;
    sort: string;
    status: string;
  };
  modal: {
    createTitle: string;
    editTitle: string;
  };
  placeholders: {
    name: string;
    code: string;
    type: string;
  };
  validation: {
    nameRequired: string;
    codeRequired: string;
  };
  buttonTypes: {
    add: string;
    edit: string;
    delete: string;
    export: string;
  };
  status: {
    enabled: string;
    disabled: string;
  };
  tree: {
    title: string;
    searchPlaceholder: string;
    rootCount: string;
    emptyText: string;
  };
  feedback: {
    treeLoadFailed: string;
    listLoadFailed: string;
    detailLoadFailed: string;
    createSuccess: string;
    updateSuccess: string;
    deleteSuccess: string;
    deleteFailed: string;
  };
  confirm: {
    deleteTitle: string;
  };
}

export interface NebulaButtonPermissionMessages {
  title: string;
  searchPlaceholder: string;
  emptyText: string;
  actions: {
    save: string;
    allowAll: string;
    denyAll: string;
    clearAll: string;
  };
  effects: {
    none: string;
    allow: string;
    deny: string;
  };
  feedback: {
    saveSuccess: string;
    saveFailed: string;
  };
}

export interface NebulaDictMessages {
  actions: {
    createType: string;
    createItem: string;
    items: string;
    edit: string;
    delete: string;
    save: string;
    cancel: string;
  };
  columns: {
    code: string;
    name: string;
    remark: string;
    itemValue: string;
    parentId: string;
    sort: string;
    status: string;
    actions: string;
  };
  fields: {
    code: string;
    name: string;
    remark: string;
    itemValue: string;
    parentId: string;
    sort: string;
    status: string;
    tagColor: string;
  };
  modal: {
    createTypeTitle: string;
    editTypeTitle: string;
    itemTitle: string;
    createItemTitle: string;
    editItemTitle: string;
  };
  placeholders: {
    code: string;
    name: string;
    remark: string;
    itemValue: string;
    parentId: string;
    tagColor: string;
  };
  validation: {
    codeRequired: string;
    nameRequired: string;
    itemValueRequired: string;
  };
  status: {
    enabled: string;
    disabled: string;
  };
  feedback: {
    typeListLoadFailed: string;
    typeCreateSuccess: string;
    typeUpdateSuccess: string;
    typeDeleteSuccess: string;
    itemOptionsLoadFailed: string;
    itemListLoadFailed: string;
    itemCreateSuccess: string;
    itemUpdateSuccess: string;
    itemDeleteSuccess: string;
  };
  confirm: {
    typeDeleteTitle: string;
    itemDeleteTitle: string;
  };
}

export interface NebulaParamMessages {
  actions: {
    create: string;
    edit: string;
    delete: string;
    save: string;
    cancel: string;
    revealValue: string;
    hideValue: string;
  };
  inputs: {
    value: string;
  };
  columns: {
    paramKey: string;
    paramName: string;
    paramValue: string;
    dataType: string;
    moduleCode: string;
    actions: string;
  };
  fields: {
    paramKey: string;
    paramName: string;
    description: string;
    paramValue: string;
    dataType: string;
    optionCode: string;
    moduleCode: string;
  };
  placeholders: {
    paramKey: string;
    paramName: string;
    description: string;
    dataType: string;
    optionCode: string;
    moduleCode: string;
    value: string;
  };
  empty: {
    options: string;
  };
  validation: {
    paramKeyRequired: string;
    paramNameRequired: string;
    dataTypeRequired: string;
  };
  modal: {
    createTitle: string;
    editTitle: string;
  };
  dataTypes: {
    string: string;
    int: string;
    double: string;
    boolean: string;
    single: string;
    multiple: string;
  };
  feedback: {
    listLoadFailed: string;
    detailLoadFailed: string;
    moduleOptionsLoadFailedTitle: string;
    moduleOptionsLoadFailed: string;
    createSuccess: string;
    updateSuccess: string;
    deleteSuccess: string;
  };
  confirm: {
    deleteTitle: string;
  };
}

export interface NebulaNotifyMessages {
  actions: {
    create: string;
    edit: string;
    delete: string;
    save: string;
    cancel: string;
    refresh: string;
    view: string;
    retry: string;
    close: string;
    addUser: string;
    addRole: string;
    addOrg: string;
    selectUser: string;
    selectOrg: string;
    remove: string;
    previewSend: string;
    confirmSend: string;
    acknowledge: string;
    viewAll: string;
  };
  columns: {
    templateCode: string;
    templateName: string;
    channel: string;
    status: string;
    templateType: string;
    title: string;
    targetType: string;
    publishTime: string;
    expireTime: string;
    pinned: string;
    popup: string;
    sort: string;
    createTime: string;
    receiver: string;
    contentSummary: string;
    readStatus: string;
    readTime: string;
    recordId: string;
    messageId: string;
    variableName: string;
    description: string;
    type: string;
    actions: string;
    source: string;
    sourceName: string;
    resolvedUserCount: string;
    failReason: string;
    businessType: string;
    businessNo: string;
    sendTime: string;
    cc: string;
    subject: string;
    extendedData: string;
    channelCount: string;
    mergedUserCount: string;
    siteRecipientCount: string;
    emailRecipientCount: string;
    excludedEmailCount: string;
  };
  fields: {
    templateCode: string;
    templateName: string;
    channel: string;
    status: string;
    subjectTemplate: string;
    contentTemplate: string;
    remark: string;
    title: string;
    content: string;
    targetType: string;
    targetUsers: string;
    targetRoles: string;
    targetOrgs: string;
    publishTime: string;
    expireTime: string;
    pinned: string;
    popup: string;
    receiver: string;
    readStatus: string;
    sendRecordId: string;
    notificationTemplate: string;
    businessType: string;
    businessNo: string;
    sendStatus: string;
    sendTime: string;
  };
  modal: {
    templateManagement: string;
    announcementManagement: string;
    sendNotification: string;
    sendRecords: string;
    siteMessageQuery: string;
    inbox: string;
    notifications: string;
    popupAnnouncement: string;
    sendResult: string;
    createTemplate: string;
    editTemplate: string;
    templateDetail: string;
    createAnnouncement: string;
    editAnnouncement: string;
    confirmSend: string;
    selectUsers: string;
    selectOrg: string;
    messageDetail: string;
    recordDetail: string;
  };
  placeholders: {
    templateCode: string;
    templateName: string;
    channel: string;
    status: string;
    subjectTemplate: string;
    contentTemplate: string;
    remark: string;
    title: string;
    content: string;
    targetType: string;
    targetUsers: string;
    targetRoles: string;
    targetOrgs: string;
    channelMultiple: string;
    template: string;
    receiver: string;
    readStatus: string;
    templateParam: string;
    sendStatus: string;
    businessType: string;
    receiverUser: string;
  };
  validation: {
    templateCodeRequired: string;
    templateNameRequired: string;
    channelRequired: string;
    statusRequired: string;
    subjectTemplateRequired: string;
    contentTemplateRequired: string;
    titleRequired: string;
    contentRequired: string;
    targetRequired: string;
    channelsRequired: string;
    recipientsRequired: string;
    emailRecipientsRequired: string;
    templateRequired: string;
  };
  feedback: {
    templateListLoadFailed: string;
    templateDetailLoadFailed: string;
    templateCreateSuccess: string;
    templateCreateFailed: string;
    templateUpdateSuccess: string;
    templateUpdateFailed: string;
    templateDeleteSuccess: string;
    templateDeleteFailed: string;
    announcementListLoadFailed: string;
    announcementDetailLoadFailed: string;
    announcementCreateSuccess: string;
    announcementCreateFailed: string;
    announcementUpdateSuccess: string;
    announcementUpdateFailed: string;
    announcementDeleteSuccess: string;
    announcementDeleteFailed: string;
    targetOptionsLoadFailed: string;
    sendSuccess: string;
    sendFailed: string;
    siteMessageLoadFailed: string;
    userOptionsLoadFailed: string;
    inboxLoadFailed: string;
    markReadFailed: string;
    popupLoadFailed: string;
    popupAcknowledgeFailed: string;
    bellLoadFailed: string;
    bellUnreadRefreshFailed: string;
    templateDetailLoading: string;
    receiverOptionsLoadFailed: string;
    receiverResolveFailed: string;
    recordListLoadFailed: string;
    recordDetailLoadFailed: string;
    recordDetailUnavailable: string;
    builtinTemplateDeleteForbidden: string;
  };
  confirm: {
    templateDeleteTitle: string;
    announcementDeleteTitle: string;
    sendDescription: string;
  };
  status: {
    enabled: string;
    disabled: string;
    builtin: string;
    custom: string;
    allUsers: string;
    specifiedUsers: string;
    specifiedRoles: string;
    specifiedOrgs: string;
    unread: string;
    read: string;
    reading: string;
    loading: string;
    unknownTime: string;
    noMessages: string;
    noFilteredMessages: string;
    noSiteMessages: string;
    noCustomVariables: string;
    customVariableInput: string;
    systemVariable: string;
    yes: string;
    no: string;
    draft: string;
    published: string;
    withdrawn: string;
    success: string;
    failed: string;
    noRecords: string;
    selectedSourceSummary: string;
    inboxDescription: string;
    selectMessage: string;
  };
}

export interface NebulaSystemConfigMessages {
  dict: NebulaDictMessages;
  param: NebulaParamMessages;
  notify: NebulaNotifyMessages;
}

export interface NebulaSystemMessages {
  config: NebulaSystemConfigMessages;
}

export interface NebulaSchedulerJobMessages {
  columns: {
    jobCode: string;
    jobName: string;
    cronExpr: string;
    enabled: string;
    description: string;
    engineJobRef: string;
    paramClassName: string;
    manualTriggerEnabled: string;
    paramOverrideEnabled: string;
    actions: string;
  };
  actions: {
    refresh: string;
    edit: string;
    trigger: string;
    enable: string;
    disable: string;
    detail: string;
  };
  fields: {
    jobCode: string;
    jobName: string;
    cronExpr: string;
    enabled: string;
    defaultParamJson: string;
    description: string;
    engineJobRef: string;
    paramClassName: string;
    manualTriggerEnabled: string;
    paramOverrideEnabled: string;
    reason: string;
    param: string;
  };
  search: {
    jobCode: string;
    jobName: string;
    enabled: string;
  };
  placeholders: {
    jobCode: string;
    jobName: string;
    enabled: string;
    cronExpr: string;
    defaultParamJson: string;
    description: string;
    reason: string;
    param: string;
  };
  modal: {
    editTitle: string;
    triggerTitle: string;
    detailTitle: string;
    paramSchemaTitle: string;
    manualTriggerDisabled: string;
  };
  validation: {
    cronFormat: string;
    paramJsonFormat: string;
  };
  feedback: {
    updateSuccess: string;
    updateFailed: string;
    triggerSuccess: string;
    triggerFailed: string;
    enableSuccess: string;
    enableFailed: string;
    disableSuccess: string;
    disableFailed: string;
    listLoadFailed: string;
    detailLoadFailed: string;
    actionSuccess: string;
    actionFailed: string;
  };
  empty: {
    paramSchema: string;
  };
}

export interface NebulaSchedulerRunMessages {
  columns: {
    requestId: string;
    jobCode: string;
    runStatus: string;
    triggerSource: string;
    finalParamJson: string;
    resultMessage: string;
    resultJson: string;
    manualReason: string;
    operatorName: string;
    triggerTime: string;
    startTime: string;
    finishTime: string;
    logSource: string;
    content: string;
    truncated: string;
    actions: string;
  };
  actions: {
    detail: string;
    logs: string;
    terminate: string;
    retry: string;
    rerun: string;
  };
  search: {
    jobCode: string;
    runStatus: string;
    triggerSource: string;
    startTimeRange: string;
  };
  placeholders: {
    jobCode: string;
    runStatus: string;
    triggerSource: string;
    startTimeRange: string;
    reason: string;
  };
  modal: {
    detailTitle: string;
    logTitle: string;
    terminateTitle: string;
    retryTitle: string;
    rerunTitle: string;
    terminateConfirm: string;
    reasonLabel: string;
    logTruncated: string;
  };
  feedback: {
    listLoadFailed: string;
    detailLoadFailed: string;
    logLoadFailed: string;
    terminateSuccess: string;
    terminateFailed: string;
    retrySuccess: string;
    retryFailed: string;
    rerunSuccess: string;
    rerunFailed: string;
    actionSuccess: string;
    actionFailed: string;
  };
}

export interface NebulaSchedulerMessages {
  tabs: {
    jobs: string;
    runs: string;
  };
  pagination: {
    total: string;
  };
  job: NebulaSchedulerJobMessages;
  run: NebulaSchedulerRunMessages;
  runStatus: {
    pending: string;
    running: string;
    terminating: string;
    terminated: string;
    timeout: string;
    success: string;
    failed: string;
  };
  triggerSource: {
    scheduled: string;
    manual: string;
    retry: string;
  };
}

export interface NebulaAuditMessages {
  columns: {
    id: string;
    operatorId: string;
    operatorName: string;
    module: string;
    action: string;
    resourceType: string;
    resourceId: string;
    resourceName: string;
    requestParams: string;
    responseData: string;
    requestIp: string;
    resultStatus: string;
    resultMessage: string;
    createTime: string;
    updateTime: string;
    actions: string;
  };
  actions: {
    detail: string;
  };
  status: {
    success: string;
    failure: string;
  };
  modal: {
    detailTitle: string;
    basicInfo: string;
  };
  pagination: {
    total: string;
  };
}

export interface NebulaAuthMessages {
  roleManagement: NebulaRoleManagementMessages;
  menuManagement: NebulaMenuManagementMessages;
  userManagement: NebulaUserManagementMessages;
  orgManagement: NebulaOrgManagementMessages;
  assignment: NebulaAssignmentMessages;
  permissionConfig: NebulaPermissionConfigMessages;
  profileInfo: NebulaProfileInfoMessages;
  buttonManagement: NebulaButtonManagementMessages;
  buttonPermission: NebulaButtonPermissionMessages;
  select: NebulaSelectMessages;
}

export interface NebulaSelectMessages {
  selectedSingle: string;
  selectedMultiple: string;
  allRoles: string;
  allOrgs: string;
}

export interface NebulaMessages {
  common: NebulaCommonMessages;
  layout: NebulaLayoutMessages;
  auth: NebulaAuthMessages;
  system: NebulaSystemMessages;
  scheduler: NebulaSchedulerMessages;
  audit: NebulaAuditMessages;
}

/** Recursive type that generates all dot-notation paths to string leaves. */
type StringLeafPath<T> = {
  [Key in keyof T & string]: T[Key] extends string
    ? Key
    : T[Key] extends object
      ? `${Key}.${StringLeafPath<T[Key]>}`
      : never;
}[keyof T & string];

export type NebulaMessageKey = StringLeafPath<NebulaMessages>;
