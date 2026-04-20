const state = {
  view: 'dashboard',
  bootstrap: null,
  config: null,
  parsedServer: null,
  presets: {},
  lootFiles: { nodes: [], spawners: [] },
  dependencyGraph: [],
  selectedCorePath: 'GameUserSettings.ini',
  currentCoreContent: '',
  selectedLootPath: '',
  pendingRouteLootPath: '',
  currentLootObject: null,
  currentLootContent: '',
  currentLootAnalysis: null,
  itemCatalog: { items: [], categories: [], total: 0 },
  itemCatalogSearch: '',
  itemCatalogCategory: '__all',
  nodeRefCatalog: { refs: [], nodes: [], total: 0 },
  nodeRefSearch: '',
  nodeRefNodeFilter: '__all',
  treeSearch: '',
  focusedLootField: null,
  selectedBackup: '',
  selectedBackupFile: '',
  profiles: [],
  selectedProfileId: '',
  rotation: { enabled: false, everyMinutes: 0, entries: [] },
  graph: { nodes: [], edges: [], neighborhood: [], focus: null },
  analyzer: null,
  autoFixDraft: null,
  configInspection: null,
  configDiscovery: null,
  commandHealth: {
    reload: { configured: false, runnable: false, reason: 'missing', command: '' },
    restart: { configured: false, runnable: false, reason: 'missing', command: '' }
  },
  commandDraftHealth: {
    reload: null,
    restart: null
  },
  lootUi: {
    compact: false,
    showGuides: false,
    simpleMode: true,
    showAdvancedSpawnerFields: false,
    treeFocusPath: 'root',
    itemCatalogOpen: false,
    refCatalogOpen: false,
    showFiles: true,
    showInspector: true,
    focusMode: false,
    contextTab: 'overview',
    editorMode: 'visual',
    dirty: false
  },
};


const pageTitleKeys = { dashboard: 'dashboard', settings: 'settings', server: 'server', corefiles: 'corefiles', loot: 'loot', analyzer: 'analyzer', graph: 'graph', profiles: 'profiles', backups: 'backups', activity: 'activity', help: 'help', diff: 'diff' };
const routeByView = {
  dashboard: '/dashboard',
  settings: '/settings',
  server: '/server-settings',
  corefiles: '/core-files',
  loot: '/loot-studio',
  analyzer: '/analyzer',
  graph: '/graph',
  profiles: '/profiles',
  backups: '/backups',
  activity: '/activity',
  help: '/help',
  diff: '/diff-preview'
};
const routeAliases = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/settings': 'settings',
  '/app-settings': 'settings',
  '/server': 'server',
  '/server-settings': 'server',
  '/corefiles': 'corefiles',
  '/core-files': 'corefiles',
  '/loot': 'loot',
  '/loot-studio': 'loot',
  '/analyzer': 'analyzer',
  '/graph': 'graph',
  '/profiles': 'profiles',
  '/backups': 'backups',
  '/activity': 'activity',
  '/help': 'help',
  '/guide': 'help',
  '/diff': 'diff',
  '/diff-preview': 'diff'
};
const i18n = {
  en: {
    dashboard:'Dashboard', settings:'App Settings', server:'Server Settings', corefiles:'Core Files', loot:'Loot Studio', analyzer:'Analyzer', graph:'Graph', profiles:'Profiles', backups:'Backups', activity:'Activity', diff:'Diff Preview',
    loading:'Loading…', refresh:'Refresh', backupCore:'Backup core', reloadLoot:'Reload loot', restartServer:'Restart server',
    localFirst:'LOCAL-FIRST CONTROL PLANE', readyCheck:'READY CHECK', heroTitle:'Edit server config, design loot, snapshot profiles, and keep every risky change recoverable.', heroBody:'Start with readiness, preview diffs, save with backups, and reload only when the config is ready.',
    configDirectory:'Config directory', backupsLabel:'Backups', nodes:'Nodes', spawners:'Spawners', health:'Health', healthHint:'What is configured and what is still missing.', commandOutput:'Command output', clear:'Clear', globalSearch:'Global Search', searchHint:'Search across settings, economy, nodes, and spawners.', searchPlaceholder:'Search item, node, spawner, setting...', search:'Search',
    appSettings:'App Settings', appSettingsHint:'Local paths and shell commands.', scumConfigFolder:'SCUM config folder', backupFolder:'Backup folder', reloadLootCommand:'Reload loot command', restartServerCommand:'Restart server command', autoBackupCore:'Auto backup core files on start', saveAppConfig:'Save App Config',
    parsedServerSettings:'Parsed Server Settings', parsedHint:'Filter, edit, preview presets, and save.', filterKeys:'Filter keys...', reload:'Reload', save:'Save', saveReload:'Save + Reload',
    files:'Files', rawCoreHint:'Raw editor for GameUser and Economy.', meta:'Meta', metaHint:'Validation and stats.', noFileSelected:'No file selected', previewBeforeSaving:'Preview diff before saving.', previewDiff:'Preview Diff',
    lootFiles:'Loot Files', lootHint:'Nodes and spawners with create/clone/delete.', new:'New', inspector:'Inspector', inspectorHint:'Summary, validation, dependencies, simulator.', validation:'Validation', autoFixPreview:'Auto-fix Preview', autoFixSave:'Auto-fix + Save', usedBy:'Used By', simulator:'Simulator', run:'Run', kitTemplates:'Kit Templates', akKit:'AK kit', sniperKit:'Sniper kit', medicalKit:'Medical kit', noLootFileSelected:'No loot file selected', visualSyncHint:'Visual builder and raw JSON stay in sync.', visualBuilder:'Visual Builder', rawJson:'Raw JSON', clone:'Clone', delete:'Delete',
    analyzerOverview:'Analyzer Overview', analyzerHint:'Find missing refs, unused nodes, and top repeated items.', warnings:'Warnings', warningHint:'Checks that explain why a loot area feels wrong before you start changing random values.', missingNodeReferences:'Missing Node References', unusedNodes:'Unused Nodes', topItems:'Top Items', topItemsHint:'Repeated items across nodes.',
    dependencyGraph:'Dependency Graph', graphHint:'Spawner → Node → Item. Not cinematic, but useful.', graphFilter:'Filter nodes/spawners/items...', focusInspector:'Focus Inspector', focusHint:'Click a graph card or type a filter to inspect its neighborhood.', noFocusSelected:'No focus selected.',
    profilesTitle:'Profiles', profilesHint:'Snapshot the whole config state and apply later.', createSnapshot:'Create Snapshot', rotation:'Rotation', rotationHint:'Cycle profiles on a timer when you feel like automating your chaos.', enableRotation:'Enable rotation', everyMinutes:'Every minutes', saveRotation:'Save Rotation', runNow:'Run Now', selectedProfile:'Selected Profile', selectProfileHint:'Select a profile to see details.', applyReload:'Apply + Reload',
    backupsTitle:'Backups', backupsHint:'Snapshots before changing live config.', backupFiles:'Backup Files', backupFilesHint:'Inspect and restore one file at a time.', restoreSelectedFile:'Restore Selected File', activityTitle:'Activity', activityHint:'Save, backup, restore, apply, rotate.', diffPreview:'Diff Preview', diffHint:'Review the exact file changes before saving.',
    ok:'OK', missingConfig:'Missing / not configured', ready:'Ready', configPathNotSet:'Config path not set', nextRun:'Next run', notScheduled:'Not scheduled',
    healthConfigDir:'Config directory set', healthBackupDir:'Backup directory set', healthReloadCmd:'Reload command set', healthRestartCmd:'Restart command set', healthServerSettings:'ServerSettings.ini found', healthNodesFolder:'Nodes folder found', healthSpawnersFolder:'Spawners folder found',
    savedAppConfig:'App config saved', backupCreated:'Backup created', commandFinished:'Command finished', commandWarn:'Command returned warnings', serverSettingsSaved:'Server settings saved', serverSettingsSavedReload:'Server settings saved + reload sent', presetApplied:'Preset applied', coreSaved:'Core file saved', selectProfileFirst:'Select a profile first', profileCreated:'Profile snapshot created', profileApplied:'Profile applied + reload sent', profileDeleted:'Profile deleted', rotationSaved:'Rotation saved', rotationApplied:'Rotation applied', fileRestored:'File restored', updated:'Updated', size:'Size', bytes:'bytes', profileNamePrompt:'Profile name', profileNotesPrompt:'Notes (optional)', deleteProfileConfirm:'Delete selected profile?', restoreBackupConfirm:'Restore selected file from backup?', normalize:'Normalize', duplicate:'Duplicate', moveUp:'Up', moveDown:'Down', applyAutoFixDraft:'Load autofix draft', slider:'Slider', number:'Number', quickAdd:'Quick add', graphCounts:'Graph counts'
  },
  th: {
    dashboard:'แดชบอร์ด', settings:'ตั้งค่าแอป', server:'ตั้งค่าเซิร์ฟเวอร์', corefiles:'ไฟล์หลัก', loot:'จัดการลูท', analyzer:'ตัววิเคราะห์', graph:'กราฟความสัมพันธ์', profiles:'โปรไฟล์', backups:'แบ็กอัป', activity:'กิจกรรม', diff:'พรีวิวความต่าง',
    loading:'กำลังโหลด…', refresh:'รีเฟรช', backupCore:'แบ็กอัปไฟล์หลัก', reloadLoot:'รีโหลดลูท', restartServer:'รีสตาร์ตเซิร์ฟเวอร์',
    localFirst:'ศูนย์ควบคุมแบบโลคัล', readyCheck:'ตรวจความพร้อม', heroTitle:'แก้คอนฟิกเซิร์ฟเวอร์ ออกแบบลูท เก็บโปรไฟล์ และย้อนกลับได้ก่อนงานพัง', heroBody:'เริ่มจากเช็กความพร้อม ดู diff ก่อน save สร้าง backup แล้วค่อย reload เมื่อค่าพร้อมใช้จริง',
    configDirectory:'โฟลเดอร์คอนฟิก', backupsLabel:'แบ็กอัป', nodes:'โหนด', spawners:'สปอว์นเนอร์', health:'สุขภาพระบบ', healthHint:'ดูว่าอะไรตั้งค่าแล้ว และอะไรยังขาดอยู่', commandOutput:'ผลลัพธ์คำสั่ง', clear:'ล้าง', globalSearch:'ค้นหาทั้งระบบ', searchHint:'ค้นหาข้าม settings, economy, nodes และ spawners', searchPlaceholder:'ค้นหา item, node, spawner หรือ setting...', search:'ค้นหา',
    appSettings:'ตั้งค่าแอป', appSettingsHint:'กำหนด path และคำสั่ง shell ภายในเครื่อง', scumConfigFolder:'โฟลเดอร์คอนฟิก SCUM', backupFolder:'โฟลเดอร์แบ็กอัป', reloadLootCommand:'คำสั่งรีโหลดลูท', restartServerCommand:'คำสั่งรีสตาร์ตเซิร์ฟเวอร์', autoBackupCore:'แบ็กอัปไฟล์หลักอัตโนมัติเมื่อเปิด', saveAppConfig:'บันทึกการตั้งค่าแอป',
    parsedServerSettings:'ตั้งค่าเซิร์ฟเวอร์แบบแยกช่อง', parsedHint:'กรอง แก้ไข พรีวิว preset และบันทึก', filterKeys:'กรองคีย์...', reload:'รีโหลด', save:'บันทึก', saveReload:'บันทึก + รีโหลด',
    files:'ไฟล์', rawCoreHint:'แก้ GameUser และ Economy แบบดิบ', meta:'ข้อมูลประกอบ', metaHint:'การตรวจสอบและสถิติ', noFileSelected:'ยังไม่ได้เลือกไฟล์', previewBeforeSaving:'พรีวิว diff ก่อนบันทึก', previewDiff:'พรีวิว Diff',
    lootFiles:'ไฟล์ลูท', lootHint:'จัดการ Nodes และ Spawners พร้อมสร้าง โคลน และลบ', new:'ใหม่', inspector:'ตัวตรวจสอบ', inspectorHint:'สรุป การตรวจสอบ ความสัมพันธ์ และตัวจำลอง', validation:'การตรวจสอบ', autoFixPreview:'พรีวิวแก้อัตโนมัติ', autoFixSave:'แก้อัตโนมัติ + บันทึก', usedBy:'ถูกใช้งานโดย', simulator:'ตัวจำลอง', run:'รัน', kitTemplates:'เทมเพลตชุดของ', akKit:'ชุด AK', sniperKit:'ชุดสไนเปอร์', medicalKit:'ชุดการแพทย์', noLootFileSelected:'ยังไม่ได้เลือกไฟล์ลูท', visualSyncHint:'ตัวแก้ไขแบบภาพและ JSON ดิบจะซิงก์กัน', visualBuilder:'ตัวแก้ไขแบบภาพ', rawJson:'JSON ดิบ', clone:'โคลน', delete:'ลบ',
    analyzerOverview:'ภาพรวมการวิเคราะห์', analyzerHint:'หา ref ที่หาย โหนดที่ไม่ได้ใช้ และไอเท็มที่ซ้ำบ่อย', warnings:'คำเตือน', warningHint:'ของที่ควรเช็กก่อนจะสงสัยว่าทำไมลูทบังเกอร์เพี้ยน', missingNodeReferences:'รายการอ้างอิงโหนดที่หาย', unusedNodes:'โหนดที่ไม่ได้ใช้', topItems:'ไอเท็มที่ซ้ำบ่อย', topItemsHint:'ไอเท็มที่ซ้ำข้ามหลายโหนด',
    dependencyGraph:'กราฟความสัมพันธ์', graphHint:'Spawner → Node → Item ไม่ได้หวือหวา แต่ใช้งานจริงได้', graphFilter:'กรอง node / spawner / item...', focusInspector:'ตรวจจุดที่เลือก', focusHint:'คลิกการ์ดในกราฟหรือใช้ตัวกรองเพื่อดูความสัมพันธ์รอบจุดที่สนใจ', noFocusSelected:'ยังไม่ได้เลือกจุดโฟกัส',
    profilesTitle:'โปรไฟล์', profilesHint:'เก็บ snapshot ของคอนฟิกทั้งชุดแล้วเรียกใช้ภายหลัง', createSnapshot:'สร้าง Snapshot', rotation:'การหมุนโปรไฟล์', rotationHint:'หมุนโปรไฟล์ตามเวลาเมื่ออยากให้ระบบจัดการแทน', enableRotation:'เปิดการหมุนโปรไฟล์', everyMinutes:'ทุกกี่นาที', saveRotation:'บันทึกการหมุน', runNow:'รันทันที', selectedProfile:'โปรไฟล์ที่เลือก', selectProfileHint:'เลือกโปรไฟล์เพื่อดูรายละเอียด', applyReload:'ใช้งาน + รีโหลด',
    backupsTitle:'แบ็กอัป', backupsHint:'สแนปช็อตก่อนความเสียใจ', backupFiles:'ไฟล์ในแบ็กอัป', backupFilesHint:'เปิดดูและกู้คืนทีละไฟล์', restoreSelectedFile:'กู้คืนไฟล์ที่เลือก', activityTitle:'กิจกรรม', activityHint:'บันทึกการเซฟ แบ็กอัป กู้คืน ใช้งาน และหมุนโปรไฟล์', diffPreview:'พรีวิวความต่าง', diffHint:'พรีวิวก่อน commit ความเสียหาย',
    ok:'พร้อม', missingConfig:'ยังไม่พบ / ยังไม่ตั้งค่า', ready:'พร้อมใช้งาน', configPathNotSet:'ยังไม่ได้ตั้ง path คอนฟิก', nextRun:'รอบถัดไป', notScheduled:'ยังไม่ตั้งเวลา',
    healthConfigDir:'ตั้งค่าโฟลเดอร์คอนฟิกแล้ว', healthBackupDir:'ตั้งค่าโฟลเดอร์แบ็กอัปแล้ว', healthReloadCmd:'ตั้งค่าคำสั่งรีโหลดแล้ว', healthRestartCmd:'ตั้งค่าคำสั่งรีสตาร์ตแล้ว', healthServerSettings:'พบ ServerSettings.ini', healthNodesFolder:'พบโฟลเดอร์ Nodes', healthSpawnersFolder:'พบโฟลเดอร์ Spawners',
    savedAppConfig:'บันทึกการตั้งค่าแอปแล้ว', backupCreated:'สร้างแบ็กอัปแล้ว', commandFinished:'รันคำสั่งเสร็จแล้ว', commandWarn:'คำสั่งจบแต่มีคำเตือน', serverSettingsSaved:'บันทึก Server Settings แล้ว', serverSettingsSavedReload:'บันทึก Server Settings และส่งคำสั่งรีโหลดแล้ว', presetApplied:'ใช้ preset แล้ว', coreSaved:'บันทึกไฟล์หลักแล้ว', selectProfileFirst:'เลือกโปรไฟล์ก่อน', profileCreated:'สร้าง Snapshot แล้ว', profileApplied:'ใช้งานโปรไฟล์และรีโหลดแล้ว', profileDeleted:'ลบโปรไฟล์แล้ว', rotationSaved:'บันทึกการหมุนแล้ว', rotationApplied:'ใช้การหมุนแล้ว', fileRestored:'กู้คืนไฟล์แล้ว', updated:'อัปเดตล่าสุด', size:'ขนาด', bytes:'ไบต์', profileNamePrompt:'ชื่อโปรไฟล์', profileNotesPrompt:'โน้ตเพิ่มเติม (ถ้ามี)', deleteProfileConfirm:'ลบโปรไฟล์ที่เลือกใช่ไหม', restoreBackupConfirm:'กู้คืนไฟล์ที่เลือกจากแบ็กอัปใช่ไหม'
  }
};
state.lang = localStorage.getItem('scum_lang') || 'en';
i18n.en.help = 'Help';
i18n.th.help = 'คู่มือ';
function t(key){ return (i18n[state.lang] && i18n[state.lang][key]) || i18n.en[key] || key; }
function uiText(th, en){ return state.lang === 'th' ? th : en; }
function setLanguage(lang){ state.lang = lang === 'th' ? 'th' : 'en'; localStorage.setItem('scum_lang', state.lang); document.documentElement.lang = state.lang; applyTranslations(); if(typeof renderCommandAssist === 'function') renderCommandAssist(); if(typeof updateLootWorkspaceCopy === 'function') updateLootWorkspaceCopy(); }
function applyTranslations(){
  document.querySelectorAll('.nav').forEach((b)=>{ if(pageTitleKeys[b.dataset.view]) b.textContent=t(pageTitleKeys[b.dataset.view]); });
  const set=(sel,val)=>{ const el=document.querySelector(sel); if(el) el.textContent=val; };
  const setp=(sel,val)=>{ const el=document.querySelector(sel); if(el) el.placeholder=val; };
  set('.brand-block p.muted', state.lang==='th' ? 'ไทย / EN' : 'TH / English');
  set('#lang-toggle', state.lang==='en' ? 'ไทย' : 'EN');
  set('.topbar .eyebrow', t('localFirst')); set('#page-title', t(pageTitleKeys[state.view] || 'dashboard'));
  set('#global-refresh', t('refresh')); set('#global-backup', t('backupCore')); set('#global-reload', t('reloadLoot')); set('#global-restart', t('restartServer'));
  set('#view-dashboard .hero .eyebrow', t('readyCheck')); set('#view-dashboard .hero h3', t('heroTitle')); set('#view-dashboard .hero p.muted', t('heroBody'));
  const statLabels=document.querySelectorAll('#view-dashboard .stat-label'); if(statLabels[0]) statLabels[0].textContent=t('configDirectory'); if(statLabels[1]) statLabels[1].textContent=t('backupsLabel'); if(statLabels[2]) statLabels[2].textContent=t('nodes'); if(statLabels[3]) statLabels[3].textContent=t('spawners');
  set('#view-dashboard .grid.two .card:nth-child(1) h3', t('health')); set('#view-dashboard .grid.two .card:nth-child(1) p.muted', t('healthHint')); set('.console-head strong', t('commandOutput')); set('#clear-console', t('clear')); set('#view-dashboard .grid.two .card:nth-child(2) h3', t('globalSearch')); set('#view-dashboard .grid.two .card:nth-child(2) p.muted', t('searchHint')); setp('#global-search-term', t('searchPlaceholder')); set('#global-search-btn', t('search'));
  set('#settings-title', t('appSettings')); set('#settings-hint', t('appSettingsHint')); set('#settings-paths-title', uiText('โฟลเดอร์ทำงาน', 'Workspace paths')); set('#settings-paths-hint', uiText('ชี้ให้ถูกว่าหน้าไหนต้องแก้ไฟล์จากที่ไหน', 'Point each editor at the real folders it should work against.')); set('#label-scum-dir', t('scumConfigFolder')); set('#label-backup-dir', t('backupFolder')); set('#label-nodes-dir', uiText('โฟลเดอร์ Nodes', 'Nodes folder')); set('#label-spawners-dir', uiText('โฟลเดอร์ Spawners', 'Spawners folder')); set('#settings-paths-note', uiText('ปล่อย Nodes กับ Spawners ว่างไว้ได้ ถ้าต้องการใช้โฟลเดอร์ย่อยมาตรฐานใต้ SCUM config root', 'Leave Nodes and Spawners blank to use the default subfolders under the SCUM config root.')); set('#settings-commands-title', uiText('คำสั่งเสริม', 'Commands')); set('#settings-commands-hint', uiText('คำสั่งที่ให้ระบบช่วยรันหลัง save หรือ apply', 'Optional commands the app can run after a save or apply.')); set('#label-reload-cmd', t('reloadLootCommand')); set('#label-restart-cmd', t('restartServerCommand')); set('#label-autobackup', t('autoBackupCore')); set('#settings-status-title', uiText('สถานะการตั้งค่า', 'Setup status')); set('#settings-status-hint', uiText('ดูให้ชัดว่า root, loot folders และไฟล์หลักพร้อมจริงหรือยัง', 'See whether the root, loot folders, and required files are actually ready.')); set('#settings-discovery-title', uiText('โฟลเดอร์ที่น่าจะใช่', 'Likely folders')); set('#settings-discovery-hint', uiText('ตำแหน่งบน Windows ที่มักเจอ dedicated server config', 'Common Windows locations for a dedicated server config.')); set('#save-config-btn', t('saveAppConfig')); set('#check-config-btn', uiText('ตรวจโฟลเดอร์', 'Check folder')); set('#discover-config-btn', uiText('หาโฟลเดอร์ที่น่าจะใช่', 'Find likely folders'));
  set('#server-title', t('parsedServerSettings')); set('#server-hint', t('parsedHint')); setp('#server-field-filter', t('filterKeys')); set('#reload-server-parsed', t('reload')); set('#save-server-parsed', t('save')); set('#save-server-parsed-reload', t('saveReload')); const sectionFilter=$('server-section-filter'); if(sectionFilter){ const allOption=sectionFilter.querySelector('option[value="__all"]'); if(allOption) allOption.textContent=uiText('ทุกหมวด', 'All sections'); } const groupFilter=$('server-group-filter'); if(groupFilter){ const allOption=groupFilter.querySelector('option[value="__all"]'); if(allOption) allOption.textContent=uiText('ทุกกลุ่ม', 'All groups'); }
  const cH4=document.querySelector('#view-corefiles .grid.three .card:nth-child(1) h4'); if(cH4) cH4.textContent=t('files'); const cP1=document.querySelector('#view-corefiles .grid.three .card:nth-child(1) p.muted'); if(cP1) cP1.textContent=t('rawCoreHint'); const cH42=document.querySelector('#view-corefiles .grid.three .card:nth-child(2) h4'); if(cH42) cH42.textContent=t('meta'); const cP2=document.querySelector('#view-corefiles .grid.three .card:nth-child(2) p.muted'); if(cP2) cP2.textContent=t('metaHint'); const cEditP=document.querySelector('#view-corefiles .grid.three .card:nth-child(3) p.muted'); if(cEditP) cEditP.textContent=t('previewBeforeSaving'); if(state.selectedCorePath==='') set('#core-file-title', t('noFileSelected')); set('#core-preview-diff', t('previewDiff')); set('#core-save', t('save'));
  const lH4=document.querySelector('#view-loot .grid.three .card:nth-child(1) h4'); if(lH4) lH4.textContent=t('lootFiles'); const lP=document.querySelector('#view-loot .grid.three .card:nth-child(1) p.muted'); if(lP) lP.textContent=t('lootHint'); const listHeads=document.querySelectorAll('#view-loot .list-head h5'); if(listHeads[0]) listHeads[0].textContent=t('nodes'); if(listHeads[1]) listHeads[1].textContent=t('spawners'); set('#new-node-btn', t('new')); set('#new-spawner-btn', t('new')); set('#loot-inspector-title', t('inspector')); set('#loot-inspector-hint', t('inspectorHint')); set('#loot-validation-title', t('validation')); set('#loot-autofix-preview', t('autoFixPreview')); set('#loot-autofix-apply', t('autoFixSave')); set('#loot-usedby-title', t('usedBy')); set('#loot-simulator-title', t('simulator')); set('#loot-kit-title', t('kitTemplates')); set('#simulate-btn', t('run')); document.querySelectorAll('[data-kit="ak"]').forEach(el=>el.textContent=t('akKit')); document.querySelectorAll('[data-kit="sniper"]').forEach(el=>el.textContent=t('sniperKit')); document.querySelectorAll('[data-kit="medical"]').forEach(el=>el.textContent=t('medicalKit')); if(!state.selectedLootPath) set('#loot-editor-title', t('noLootFileSelected')); const lootP=document.querySelector('#view-loot .grid.three .card:nth-child(3) p.muted'); if(lootP) lootP.textContent=t('visualSyncHint'); set('#loot-preview-diff', t('previewDiff')); set('#loot-save', t('save')); set('#loot-save-reload', t('saveReload')); set('#toggle-visual', t('visualBuilder')); set('#toggle-raw', t('rawJson')); set('#clone-loot', t('clone')); set('#delete-loot', t('delete')); document.querySelectorAll('[data-t-normalize]').forEach(el=>el.textContent=t('normalize')); document.querySelectorAll('[data-t-duplicate]').forEach(el=>el.textContent=t('duplicate')); document.querySelectorAll('[data-t-up]').forEach(el=>el.textContent=t('moveUp')); document.querySelectorAll('[data-t-down]').forEach(el=>el.textContent=t('moveDown')); document.querySelectorAll('[data-t-apply-draft]').forEach(el=>el.textContent=t('applyAutoFixDraft')); document.querySelectorAll('[data-t-quickadd]').forEach(el=>el.textContent=t('quickAdd'));
  set('#view-analyzer .grid.two .card:nth-child(1) h3', t('analyzerOverview')); set('#view-analyzer .grid.two .card:nth-child(1) p.muted', t('analyzerHint')); set('#refresh-analyzer', t('refresh')); set('#view-analyzer .grid.two .card:nth-child(2) h3', t('warnings')); set('#view-analyzer .grid.two .card:nth-child(2) p.muted', t('warningHint')); const warnHeads=document.querySelectorAll('#view-analyzer .grid.two .card:nth-child(2) h4'); if(warnHeads[0]) warnHeads[0].textContent=t('missingNodeReferences'); if(warnHeads[1]) warnHeads[1].textContent=t('unusedNodes'); const topCard=document.querySelector('#view-analyzer > .card:last-child h3'); if(topCard) topCard.textContent=t('topItems'); const topCardP=document.querySelector('#view-analyzer > .card:last-child p.muted'); if(topCardP) topCardP.textContent=t('topItemsHint');
  set('#view-graph h3', t('dependencyGraph')); set('#view-graph .section-head p.muted', t('graphHint')); setp('#graph-filter', t('graphFilter')); set('#refresh-graph', t('refresh')); const focusH=document.querySelector('#view-graph .graph-side h4'); if(focusH) focusH.textContent=t('focusInspector'); const focusP=document.querySelector('#view-graph .graph-side p.muted'); if(focusP) focusP.textContent=t('focusHint'); const focusEmpty=document.querySelector('#graph-focus-summary .muted'); if(focusEmpty) focusEmpty.textContent=t('noFocusSelected');
  set('#view-profiles .grid.two .card:nth-child(1) h3', t('profilesTitle')); set('#view-profiles .grid.two .card:nth-child(1) p.muted', t('profilesHint')); set('#profile-create', t('createSnapshot')); set('#refresh-profiles', t('refresh')); const rotationHead=document.querySelector('#view-profiles .card.stack-spaced h4'); if(rotationHead) rotationHead.textContent=t('rotation'); const rotationP=document.querySelector('#view-profiles .card.stack-spaced p.muted'); if(rotationP) rotationP.textContent=t('rotationHint'); const rotSpan=document.querySelector('#rotation-enabled + span'); if(rotSpan) rotSpan.textContent=t('enableRotation'); const rotLabel=document.querySelector('#rotation-minutes')?.parentElement?.querySelector('span'); if(rotLabel) rotLabel.textContent=t('everyMinutes'); set('#rotation-save', t('saveRotation')); set('#rotation-run', t('runNow')); const selectedP=document.querySelector('#view-profiles .card.stack-spaced > div:last-child h4'); if(selectedP) selectedP.textContent=t('selectedProfile'); const pd=document.querySelector('#profile-detail'); if(pd && pd.textContent.includes('Select a profile')) pd.textContent=t('selectProfileHint'); set('#profile-apply', t('applyReload')); set('#profile-delete', t('delete'));
  set('#view-backups .grid.two .card:nth-child(1) h3', t('backupsTitle')); set('#view-backups .grid.two .card:nth-child(1) p.muted', t('backupsHint')); set('#refresh-backups', t('refresh')); set('#view-backups .grid.two .card:nth-child(2) h3', t('backupFiles')); set('#view-backups .grid.two .card:nth-child(2) p.muted', t('backupFilesHint')); set('#restore-backup-file', t('restoreSelectedFile'));
  set('#view-activity h3', t('activityTitle')); set('#view-activity p.muted', t('activityHint')); set('#refresh-activity', t('refresh')); renderHelpGuide(); set('#view-diff h3', t('diffPreview')); set('#view-diff p.muted', t('diffHint'));
}

const $ = (id) => document.getElementById(id);
const pageTitles = pageTitleKeys;

function escapeHtml(v=''){ return String(v).replace(/[&<>"']/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function fmtJson(obj){ return JSON.stringify(obj, null, 2); }
function fmtDate(v){ return v ? new Date(v).toLocaleString() : '-'; }
function showToast(message, isError=false){ const el=$('toast'); el.textContent=message; el.classList.remove('hidden'); el.style.borderColor=isError?'rgba(255,115,115,.5)':'rgba(118,179,255,.45)'; clearTimeout(showToast.t); showToast.t=setTimeout(()=>el.classList.add('hidden'),2600); }
function renderHelpGuide(){
  const set=(id,val)=>{ const el=$(id); if(el) el.innerHTML=val; };
  const step = (label, body) => `<li><strong>${escapeHtml(label)}</strong><span>${escapeHtml(body)}</span></li>`;
  const chip = (label, tone='') => `<span class="guide-chip ${tone}">${escapeHtml(label)}</span>`;
  const flowMap = () => `<div id="help-flow-map" class="help-flow-map">${[
    [uiText('ตั้ง Path', 'Set paths'), uiText('ชี้ root, Nodes, Spawners', 'Point root, Nodes, Spawners')],
    [uiText('เปิดไฟล์', 'Open file'), uiText('เลือก node หรือ spawner', 'Pick a node or spawner')],
    [uiText('แก้แบบง่าย', 'Edit simple'), uiText('ใช้ปุ่มลัดและ catalog', 'Use shortcuts and catalog')],
    [uiText('ตรวจปัญหา', 'Validate'), uiText('ดู warning/critical ก่อน save', 'Check warning/critical before save')],
    [uiText('Save อย่างปลอดภัย', 'Safe save'), uiText('Preview Diff, backup, แล้วค่อย reload', 'Preview Diff, backup, then reload')]
  ].map(([titleText, bodyText], index)=>`<div class="help-flow-step"><span>${index + 1}</span><strong>${escapeHtml(titleText)}</strong><small>${escapeHtml(bodyText)}</small></div>`).join('')}</div>`;
  const title = $('help-title');
  const body = $('help-body');
  const eyebrow = $('help-eyebrow');
  if(eyebrow) eyebrow.textContent = uiText('คู่มือใช้งานในเครื่อง', 'Local guide');
  if(title) title.textContent = uiText('ใช้งานโดยไม่ต้องเดาโครงไฟล์เอง', 'Use the app without guessing the config structure.');
  if(body) body.textContent = uiText('สรุปลำดับทำงานจริงสำหรับตั้งค่า path, แก้ loot, ตรวจ validation และ save แบบไม่ลุ้นดวง', 'A short operating guide for setup, loot editing, validation, and safe save flow.');
  document.querySelectorAll('[data-help-view]').forEach((button)=>{
    const target = button.dataset.helpView;
    button.textContent = {
      settings: uiText('เปิด App Settings', 'Open App Settings'),
      loot: uiText('เปิด Loot Studio', 'Open Loot Studio'),
      analyzer: uiText('เปิด Analyzer', 'Open Analyzer')
    }[target] || target;
    button.onclick = () => setView(target);
  });
  set('help-quick-path', `<div class="section-head compact"><div><h4>${escapeHtml(uiText('เริ่มใช้งานจริง', 'Real-use starting path'))}</h4><p class="muted">${escapeHtml(uiText('ทำตามนี้ก่อนแก้ไฟล์จริง จะลดโอกาส save แล้วงงว่าอะไรพัง', 'Follow this before editing real files so failed saves are easier to understand.'))}</p></div></div><ol class="help-step-list">${[
    step(uiText('ตั้งค่า SCUM config folder', 'Set the SCUM config folder'), uiText('ไป App Settings แล้วเลือกโฟลเดอร์ WindowsServer ที่มี ServerSettings.ini, Nodes และ Spawners', 'Open App Settings and point it at the WindowsServer folder that contains ServerSettings.ini, Nodes, and Spawners.')),
    step(uiText('ตั้งค่า backup folder', 'Set the backup folder'), uiText('ให้ระบบมีที่เก็บสำเนาก่อน save หรือ restore', 'Give the app a place to store snapshots before save or restore.')),
    step(uiText('กดตรวจโฟลเดอร์', 'Check the folders'), uiText('ดูว่า Nodes folder, Spawners folder และไฟล์หลักเจอครบหรือยัง', 'Confirm that Nodes folder, Spawners folder, and core files are found.')),
    step(uiText('ค่อยเริ่มแก้', 'Start editing after setup'), uiText('ถ้าสถานะยังแดง ให้แก้ path ก่อน ไม่ต้องเริ่มจาก Loot Studio', 'If status is still red, fix paths first instead of starting in Loot Studio.'))
  ].join('')}</ol>${flowMap()}`);
  set('help-loot-guide', `<div class="section-head compact"><div><h4>${escapeHtml(uiText('Loot Studio อ่านยังไง', 'How to read Loot Studio'))}</h4><p class="muted">${escapeHtml(uiText('จำแค่นี้ก่อน จะไม่หลงกับไฟล์ยาว ๆ', 'Remember these basics first so long files do not feel random.'))}</p></div></div><div class="help-concept-grid"><div>${chip('Nodes', 'info')}<p>${escapeHtml(uiText('คือกล่องรายการของที่อาจถูกสุ่ม เช่น ปืน กระสุน ยา หรือของทั่วไป', 'A bucket of items that can be rolled, such as weapons, ammo, medicine, or general loot.'))}</p></div><div>${chip('Spawners', 'warning')}<p>${escapeHtml(uiText('คือจุดหรือ preset ที่ไปเรียก Nodes อีกที ถ้า Spawner ชี้ node ผิด ลูทจุดนั้นจะเพี้ยน', 'A spawn preset that points to Nodes. If a Spawner points to the wrong node, that location will feel wrong.'))}</p></div><div>${chip(uiText('Probability', 'Probability'), 'critical')}<p>${escapeHtml(uiText('คือค่าน้ำหนัก ยิ่งสูงยิ่งมีโอกาสออกมากกว่า ใช้ Normalize เมื่ออยากจัดสัดส่วนใหม่', 'A weight value. Higher means more likely. Use Normalize when you want the rows balanced again.'))}</p></div></div><div class="help-note">${escapeHtml(uiText('ถ้าไฟล์ยาว ให้ใช้ Focus Editor, ซ่อนรายชื่อไฟล์, เปิดเฉพาะแถวนั้น และใช้ Item catalog แทนการพิมพ์ชื่อเอง', 'For large files, use Focus Editor, hide the file list, open only the row you need, and use Item catalog instead of typing names manually.'))}</div>`);
  set('help-save-guide', `<div class="section-head compact"><div><h4>${escapeHtml(uiText('ลำดับ save ที่ปลอดภัย', 'Safe save flow'))}</h4><p class="muted">${escapeHtml(uiText('อย่ากด Save แบบเดา ให้ตรวจความต่างก่อน', 'Do not save blindly. Check the diff first.'))}</p></div></div><ol class="help-step-list">${[
    step('Preview Diff', uiText('ดูว่าระบบกำลังเปลี่ยนไฟล์ตรงไหนบ้างก่อนบันทึก', 'See exactly what will change before saving.')),
    step(uiText('Validation', 'Validation'), uiText('ดู critical/warning ก่อน ถ้ามี fix draft ให้ใช้เฉพาะรายการที่เข้าใจ', 'Review critical/warning items first. Use Fix draft only for issues you understand.')),
    step(uiText('Backup', 'Backup'), uiText('ระบบควรมี backup ก่อน save ถ้ายังไม่มั่นใจให้กด Backup core เพิ่มเอง', 'The app should have backups before saving. If unsure, create another core backup manually.')),
    step(uiText('Save หรือ Save + Reload', 'Save or Save + Reload'), uiText('Save เฉย ๆ เมื่อยังทดสอบอยู่ ใช้ Save + Reload เมื่อพร้อมส่งผลเข้าเซิร์ฟเวอร์', 'Use Save while testing. Use Save + Reload only when you are ready to apply it to the server.'))
  ].join('')}</ol>`);
  set('help-settings-guide', `<div class="section-head compact"><div><h4>${escapeHtml(uiText('หน้า Server Settings', 'Server Settings page'))}</h4><p class="muted">${escapeHtml(uiText('หน้านี้ควรแก้แบบเลือกหมวด ไม่ต้องไล่อ่านทุกค่า', 'Use this page by section and group instead of scanning every field.'))}</p></div></div><ul class="help-step-list">${[
    step(uiText('ใช้ dropdown ทุกหมวด/ทุกกลุ่ม', 'Use section/group dropdowns'), uiText('กรองค่าที่ต้องการก่อน จะไม่รกทั้งหน้า', 'Filter down to the relevant settings first so the page stays readable.')),
    step('True / False', uiText('ช่อง boolean ใช้ select แล้ว ไม่ต้องพิมพ์เอง', 'Boolean fields use selects now, so you do not have to type them manually.')),
    step(uiText('ช่องเลข', 'Number fields'), uiText('แก้เฉพาะค่าที่รู้ผลกระทบ ถ้าไม่แน่ใจให้ Preview Diff ก่อน', 'Only change values you understand. If unsure, inspect Preview Diff first.'))
  ].join('')}</ul>`);
}
async function api(url, options={}){ const res=await fetch(url,{ headers:{'Content-Type':'application/json', ...(options.headers||{})}, ...options }); const data=await res.json(); if(!data.ok) throw new Error(data.error||'Request failed'); return data; }
function setLootSaveBusy(busy){
  const labelMap = {
    'loot-save': busy ? uiText('กำลังบันทึก...', 'Saving...') : t('save'),
    'loot-save-reload': busy ? uiText('กำลังบันทึก...', 'Saving...') : t('saveReload'),
    'loot-autofix-apply': busy ? uiText('กำลังประมวลผล...', 'Working...') : t('autoFixSave'),
    'loot-autofix-preview': busy ? uiText('กำลังประมวลผล...', 'Working...') : t('autoFixPreview')
  };
  ['loot-save','loot-save-reload','loot-autofix-apply','loot-autofix-preview'].forEach((id)=>{
    const el = $(id);
    if(!el) return;
    el.disabled = !!busy;
    if(labelMap[id]) el.textContent = labelMap[id];
  });
}
function getLootDraftContent(){
  if(!$('loot-editor')) return '';
  if($('loot-editor').classList.contains('hidden')) return fmtJson(state.currentLootObject || {});
  return $('loot-editor').value;
}
function refreshLootDirtyState(){
  const dirty = Boolean(state.selectedLootPath) && getLootDraftContent() !== (state.currentLootContent || '');
  state.lootUi.dirty = dirty;
  updateLootWorkspaceCopy();
  return dirty;
}
function markLootDirty(force = true){
  state.lootUi.dirty = !!force;
  updateLootWorkspaceCopy();
}
function updateLootWorkspaceLayout(){
  const view = $('view-loot');
  if(!view) return;
  view.classList.toggle('loot-hide-files', !state.lootUi.showFiles && !state.lootUi.focusMode);
  view.classList.toggle('loot-hide-inspector', !state.lootUi.showInspector && !state.lootUi.focusMode);
  view.classList.toggle('loot-focus-mode', !!state.lootUi.focusMode);
  const fileButton = $('loot-files-toggle');
  if(fileButton) fileButton.classList.toggle('active', !!state.lootUi.showFiles && !state.lootUi.focusMode);
  const contextButton = $('loot-inspector-toggle');
  if(contextButton) contextButton.classList.toggle('active', !!state.lootUi.showInspector && !state.lootUi.focusMode);
  const focusButton = $('loot-focus-toggle');
  if(focusButton) focusButton.classList.toggle('active', !!state.lootUi.focusMode);
  updateLootWorkspaceCopy();
}
function updateLootWorkspaceCopy(){
  const currentFile = $('loot-current-file');
  const dirtyIndicator = $('loot-dirty-indicator');
  const fileToggle = $('loot-files-toggle');
  const contextToggle = $('loot-inspector-toggle');
  const inspectorToggle = contextToggle;
  const focusToggle = $('loot-focus-toggle');
  const resetLayout = $('loot-reset-layout');
  const title = $('loot-workspace-title');
  const hint = $('loot-workspace-hint');
  if(title) title.textContent = uiText('พื้นที่ทำงานลูท', 'Loot workspace');
  if(hint) hint.textContent = uiText('เปิดเฉพาะแผงที่ต้องใช้ จะอ่านไฟล์ใหญ่ได้สบายกว่ามาก', 'Keep only the panels you need open so large loot files stay readable.');
  if(currentFile){
    currentFile.textContent = state.selectedLootPath || uiText('ยังไม่ได้เลือกไฟล์ลูท', 'No loot file selected');
    currentFile.className = `tag ${state.selectedLootPath ? 'node' : ''}`.trim();
  }
  if(dirtyIndicator){
    dirtyIndicator.textContent = state.lootUi.dirty ? uiText('ยังไม่ได้บันทึก', 'Unsaved changes') : uiText('บันทึกแล้ว', 'Saved');
    dirtyIndicator.className = `tag ${state.lootUi.dirty ? 'attention' : 'success'}`;
  }
  if(fileToggle) fileToggle.textContent = !state.lootUi.showFiles || state.lootUi.focusMode ? uiText('เปิดรายชื่อไฟล์', 'Show files') : uiText('ซ่อนรายชื่อไฟล์', 'Hide files');
  if(inspectorToggle) inspectorToggle.textContent = !state.lootUi.showInspector || state.lootUi.focusMode ? uiText('เปิด Inspector', 'Show inspector') : uiText('ซ่อน Inspector', 'Hide inspector');
  if(focusToggle) focusToggle.textContent = state.lootUi.focusMode ? uiText('ออกจากโหมดโฟกัส', 'Exit focus mode') : uiText('โฟกัสเฉพาะ Editor', 'Focus editor');
  if(resetLayout) resetLayout.textContent = uiText('รีเซ็ตเลย์เอาต์', 'Reset layout');
}
function confirmDiscardLootChanges(targetLabel=''){
  if(!state.lootUi.dirty) return true;
  return confirm(uiText(
    `มีการแก้ไขใน ${state.selectedLootPath || 'ไฟล์ลูทปัจจุบัน'} ที่ยังไม่ได้บันทึก ต้องการทิ้งแล้วไปต่อ${targetLabel ? `ไป ${targetLabel}` : ''} ใช่ไหม`,
    `You have unsaved changes in ${state.selectedLootPath || 'the current loot file'}. Discard them${targetLabel ? ` and continue to ${targetLabel}` : ''}?`
  ));
}
function syncRawEditorToVisualBuilder(){
  try {
    state.currentLootObject = JSON.parse($('loot-editor').value || '{}');
    renderVisualBuilder();
    refreshLootDirtyState();
    return true;
  } catch (error) {
    showToast(error.message || uiText('JSON ไม่ถูกต้อง', 'Invalid JSON'), true);
    writeConsole(error.message || String(error));
    return false;
  }
}
function setLootEditorMode(mode){
  if(mode === state.lootUi.editorMode){
    updateLootWorkspaceCopy();
    return;
  }
  if(mode === 'visual'){
    if(!$('loot-editor').classList.contains('hidden') && !syncRawEditorToVisualBuilder()) return;
    $('visual-builder').classList.remove('hidden');
    $('loot-editor').classList.add('hidden');
    state.lootUi.editorMode = 'visual';
  } else {
    $('loot-editor').value = fmtJson(state.currentLootObject || {});
    $('visual-builder').classList.add('hidden');
    $('loot-editor').classList.remove('hidden');
    state.lootUi.editorMode = 'raw';
  }
  $('toggle-visual')?.classList.toggle('active', state.lootUi.editorMode === 'visual');
  $('toggle-raw')?.classList.toggle('active', state.lootUi.editorMode === 'raw');
  refreshLootDirtyState();
}
function normalizeRoutePath(pathname = window.location.pathname){
  let path = String(pathname || '/').replace(/\/+$/, '');
  if(!path) path = '/';
  const view = routeAliases[path] || 'dashboard';
  const canonicalPath = routeByView[view] || routeByView.dashboard;
  return { view, canonicalPath, shouldNormalize: path !== canonicalPath };
}
function currentRouteQuery(){
  return new URLSearchParams(window.location.search || '');
}
function lootRoutePath(filePath = ''){
  const base = routeByView.loot || '/loot-studio';
  const file = String(filePath || '').trim();
  return file ? `${base}?file=${encodeURIComponent(file)}` : base;
}
function routePathForView(view, extra = {}){
  if(view === 'loot') return lootRoutePath(extra.file || '');
  return routeByView[view] || routeByView.dashboard;
}
function updateRoute(view, mode = 'push', extra = {}){
  const path = routePathForView(view, extra);
  if(`${window.location.pathname}${window.location.search}` === path) return;
  const method = mode === 'replace' ? 'replaceState' : 'pushState';
  window.history[method]({ view, file: extra.file || '' }, '', path);
}
function setView(view, options = {}){
  const nextView = pageTitles[view] ? view : 'dashboard';
  const viewEl = $(`view-${nextView}`);
  if(!viewEl) return;
  state.view = nextView;
  document.querySelectorAll('.nav').forEach((b)=>{
    const active = b.dataset.view === nextView;
    b.classList.toggle('active', active);
    if(active) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  document.querySelectorAll('.view').forEach((v)=>v.classList.remove('active'));
  viewEl.classList.add('active');
  $('page-title').textContent = t(pageTitles[nextView] || 'dashboard');
  document.title = `${t(pageTitles[nextView] || 'dashboard')} · SETTING SERVER SCUM`;
  if(options.updateRoute !== false) updateRoute(nextView, options.replaceRoute ? 'replace' : 'push', options.route || {});
}
function setViewFromRoute(){
  const route = normalizeRoutePath();
  const params = currentRouteQuery();
  state.pendingRouteLootPath = route.view === 'loot' ? (params.get('file') || '') : '';
  setView(route.view, { updateRoute: false });
  if(route.shouldNormalize) {
    updateRoute(route.view, 'replace', route.view === 'loot' && state.pendingRouteLootPath ? { file: state.pendingRouteLootPath } : {});
  }
}
function setStatus(ok, text){ $('status-dot').classList.toggle('good', ok); $('status-text').textContent=text; }
function writeConsole(text){ $('command-output').textContent = text || ''; }
function healthLabel(key){
  const map = {
    config_dir_set: t('healthConfigDir'),
    config_dir_exists: uiText('พบโฟลเดอร์คอนฟิก', 'Config directory exists'),
    backup_dir_set: t('healthBackupDir'),
    reload_cmd_set: t('healthReloadCmd'),
    restart_cmd_set: t('healthRestartCmd'),
    server_settings_found: t('healthServerSettings'),
    nodes_found: t('healthNodesFolder'),
    spawners_found: t('healthSpawnersFolder'),
  };
  return map[key] || key;
}
function requiredItemLabel(key){
  const map = {
    'ServerSettings.ini': 'ServerSettings.ini',
    'GameUserSettings.ini': 'GameUserSettings.ini',
    'EconomyOverride.json': 'EconomyOverride.json',
    Nodes: uiText('โฟลเดอร์ Nodes', 'Nodes folder'),
    Spawners: uiText('โฟลเดอร์ Spawners', 'Spawners folder'),
  };
  return map[key] || key;
}

function healthRows(data){
  const fileHealth = data.fileHealth || {};
  return [
    ['config_dir_set', !!data.health?.configSet],
    ['config_dir_exists', !!data.health?.configPathExists],
    ['backup_dir_set', !!data.health?.backupDirSet],
    ['reload_cmd_set', !!data.health?.reloadConfigured],
    ['restart_cmd_set', !!data.health?.restartConfigured],
    ['server_settings_found', !!fileHealth['ServerSettings.ini']],
    ['nodes_found', !!fileHealth['Nodes']],
    ['spawners_found', !!fileHealth['Spawners']],
  ];
}
function renderHealth(data){ $('health-grid').innerHTML = healthRows(data).map(([labelKey, good]) => `<div class="health-item ${good?'good':'bad'}"><strong>${escapeHtml(healthLabel(labelKey))}</strong><div class="muted">${good?t('ok'):t('missingConfig')}</div></div>`).join(''); }
function renderValidation(v){
  if(!v) return `<div class="muted">${escapeHtml(uiText('ยังไม่มีข้อมูล validation', 'No validation data yet.'))}</div>`;
  const counts = v.counts || { critical:(v.errors||[]).length, warning:(v.warnings||[]).length, info:(v.info||[]).length };
  const entries = Array.isArray(v.entries) && v.entries.length
    ? v.entries
    : [
      ...(v.errors||[]).map((message)=>({ severity:'critical', message, fixable:false })),
      ...(v.warnings||[]).map((message)=>({ severity:'warning', message, fixable:false })),
      ...(v.info||[]).map((message)=>({ severity:'info', message, fixable:false }))
    ];
  if(!entries.length){
    return `<div class="success-card">${escapeHtml(uiText('ไม่พบปัญหา validation', 'No validation issues detected.'))}</div>`;
  }
  const sections = [
    { key:'critical', title:uiText('Critical', 'Critical'), card:'warn-card validation-card severity-critical' },
    { key:'warning', title:uiText('Warnings', 'Warnings'), card:'warn-card validation-card severity-warning' },
    { key:'info', title:uiText('Info', 'Info'), card:'section-card validation-card severity-info' }
  ];
  const summary = `<div class="validation-overview pill-row"><span class="tag critical">${counts.critical || 0} ${escapeHtml(uiText('critical', 'critical'))}</span><span class="tag warning">${counts.warning || 0} ${escapeHtml(uiText('warning', 'warning'))}</span><span class="tag info">${counts.info || 0} ${escapeHtml(uiText('info', 'info'))}</span>${v.fixableCount ? `<span class="tag fixable">${v.fixableCount} ${escapeHtml(uiText('แก้อัตโนมัติได้', 'auto-fixable'))}</span>` : ''}</div>`;
  const body = sections.map((section)=>{
    const items = entries.filter((entry)=>entry.severity===section.key);
    if(!items.length) return '';
    return `<div class="${section.card}"><div class="section-head compact"><div><h4>${escapeHtml(section.title)}</h4></div><span class="tag ${section.key}">${items.length}</span></div><div class="validation-list">${items.map((entry)=>`<div class="validation-row"><div class="validation-copy"><strong>${escapeHtml(entry.message || '')}</strong>${entry.path ? `<div class="muted small">${escapeHtml(entry.path)}</div>` : ''}${entry.suggestion ? `<div class="muted small">${escapeHtml(entry.suggestion)}</div>` : ''}</div>${entry.fixable ? `<span class="tag fixable">${escapeHtml(uiText('Fixable', 'Fixable'))}</span>` : ''}</div>`).join('')}</div></div>`;
  }).join('');
  return `${summary}${body}`;
}
function renderAutoFixNotes(data){
  const changes = data?.changes || data?.warnings || [];
  const validation = data?.validation || null;
  const counts = validation?.counts || { critical:0, warning:0, info:0 };
  const summary = `<div class="validation-overview pill-row"><span class="tag fixable">${changes.length} ${escapeHtml(uiText('รายการแก้อัตโนมัติ', 'auto-fix changes'))}</span><span class="tag critical">${counts.critical || 0} ${escapeHtml(uiText('critical คงเหลือ', 'critical left'))}</span><span class="tag warning">${counts.warning || 0} ${escapeHtml(uiText('warning คงเหลือ', 'warning left'))}</span></div>`;
  const list = changes.length
    ? `<div class="section-card autofix-card"><strong>${escapeHtml(uiText('สิ่งที่ auto-fix จัดให้', 'What auto-fix changed'))}</strong><ul class="bad-list autofix-list">${changes.map((message)=>`<li>${escapeHtml(message)}</li>`).join('')}</ul></div>`
    : `<div class="success-card">${escapeHtml(uiText('ไม่พบจุดที่ต้องแก้อัตโนมัติ', 'No auto-fix changes were needed.'))}</div>`;
  return `${summary}${list}`;
}
const LOOT_RARITIES = ['Abundant','Common','Uncommon','Rare','VeryRare','ExtremelyRare'];
function detectLootKind(obj){ if(!obj || typeof obj !== 'object' || Array.isArray(obj)) return 'unknown'; if(Array.isArray(obj.Items)) return 'node'; if(Array.isArray(obj.Nodes)) return 'spawner'; if(Array.isArray(obj.Children) || typeof obj.Rarity === 'string') return 'node_tree'; return 'unknown'; }
function lootKindLabel(kind){ const labels={ node:uiText('ไอเท็มโหนดแบบแบน','Flat item node'), node_tree:uiText('โหนดต้นไม้จริง','Tree node'), spawner:uiText('สปอว์นเนอร์พรีเซ็ต','Spawner preset'), unknown:uiText('ยังไม่รู้ schema','Unknown schema') }; return labels[kind] || kind; }
function buildRarityOptions(value=''){ return [`<option value="">${escapeHtml(uiText('ไม่ตั้งค่า','Unset'))}</option>`, ...LOOT_RARITIES.map((rarity)=>`<option value="${rarity}" ${rarity===value?'selected':''}>${rarity}</option>`)].join(''); }
function buildBooleanOptions(value){ return `<option value="true" ${value===true?'selected':''}>True</option><option value="false" ${value===false?'selected':''}>False</option>`; }
function parseTreePath(value){ return value==='root' || !value ? [] : String(value).split('.').map((part)=>Number(part)).filter((part)=>Number.isFinite(part)); }
function getTreeNodeAtPath(root, path){ let current=root; for(const index of parseTreePath(path)){ if(!current || !Array.isArray(current.Children) || !current.Children[index]) return null; current=current.Children[index]; } return current; }
function getTreeParentInfo(root, path){ const parts=parseTreePath(path); if(!parts.length) return null; const index=parts.pop(); const parent=parts.length ? getTreeNodeAtPath(root, parts.join('.')) : root; if(!parent || !Array.isArray(parent.Children)) return null; return { parent, index, collection: parent.Children }; }
function collectSpawnerRefs(obj){ if(!obj || !Array.isArray(obj.Nodes)) return []; return obj.Nodes.flatMap((entry)=>Array.isArray(entry?.Ids) ? entry.Ids.filter((value)=>typeof value === 'string' && value.trim()) : [entry?.Node || entry?.Name || entry?.Ref].filter(Boolean)); }
function lootFileBlurb(summary){ if(!summary) return uiText('ยังไม่รู้โครงไฟล์','Unknown file shape'); if(summary.kind==='node_tree') return `${lootKindLabel(summary.kind)} · ${summary.leafCount || summary.itemCount || 0} ${uiText('ปลายทาง','leaves')} · ${summary.branchCount || 0} ${uiText('กิ่ง','branches')}`; if(summary.kind==='spawner') return `${lootKindLabel(summary.kind)} · ${summary.groupCount || 0} ${uiText('กลุ่ม','groups')} · ${summary.nodeRefCount || 0} refs`; if(summary.kind==='node') return `${lootKindLabel(summary.kind)} · ${summary.itemCount || 0} ${uiText('ไอเท็ม','items')}`; return lootKindLabel(summary.kind); }

function renderSetupNotice(data){
  const el = $('setup-notice');
  if(!el) return;
  if(data.health?.ready){
    el.classList.add('hidden');
    el.innerHTML = '';
    return;
  }
  const inspection = data.configInspection || {};
  const missing = (inspection.missing || []).map((item)=>`<li>${escapeHtml(requiredItemLabel(item))}</li>`).join('');
  const currentPath = data.config?.scumConfigDir ? `<code>${escapeHtml(data.config.scumConfigDir)}</code>` : `<span class="muted">${escapeHtml(uiText('ยังไม่ได้ตั้งค่า path', 'No config folder is set yet.'))}</span>`;
  el.innerHTML = `<h3>${escapeHtml(uiText('ตั้งค่าก่อนถึงจะเริ่มแก้ไฟล์ได้จริง', 'Finish setup before editing for real'))}</h3><p class="muted">${escapeHtml(uiText('เลือกโฟลเดอร์ WindowsServer ของ SCUM ให้ถูกต้องก่อน แล้วทุกหน้า editor จะเริ่มทำงานตามไฟล์จริงในเครื่องนี้', 'Point the app at your SCUM WindowsServer folder first. Once that path is valid, the editor pages will operate on real files on this machine.'))}</p><div class="path-line"><strong>${escapeHtml(uiText('Path ปัจจุบัน', 'Current path'))}:</strong> ${currentPath}</div>${missing ? `<ul class="setup-list">${missing}</ul>` : ''}<div class="path-actions"><button id="open-settings-setup">${escapeHtml(uiText('ไปหน้า App Settings', 'Open App Settings'))}</button><button id="notice-discover-config" class="ghost">${escapeHtml(uiText('หาโฟลเดอร์ที่น่าจะใช่', 'Find likely folders'))}</button></div>`;
  el.classList.remove('hidden');
  $('open-settings-setup').onclick=()=>setView('settings');
  $('notice-discover-config').onclick=()=>{ setView('settings'); discoverConfigFolders().catch((error)=>showToast(error.message, true)); };
}

function renderConfigInspection(inspection){
  state.configInspection = inspection || null;
  const el = $('settings-check-result');
  if(!el) return;
  if(!inspection || !inspection.path){
    renderSettingsStatusSummary({ config: state.config, configInspection: inspection });
    el.innerHTML = '';
    return;
  }
  const pills = [
    `<span class="pill ${inspection.exists ? 'good' : 'bad'}">${escapeHtml(inspection.exists ? uiText('พบ path', 'Path exists') : uiText('ไม่พบ path', 'Path not found'))}</span>`,
    `<span class="pill ${inspection.ready ? 'good' : 'bad'}">${escapeHtml(inspection.ready ? uiText('พร้อมใช้งาน', 'Ready for editing') : uiText('ยังไม่พร้อม', 'Not ready yet'))}</span>`
  ].join('');
  const missing = inspection.missing?.length ? `<div class="muted">${escapeHtml(uiText('ยังขาด', 'Missing'))}: ${escapeHtml(inspection.missing.map(requiredItemLabel).join(', '))}</div>` : '';
  el.innerHTML = `<div class="path-result ${inspection.ready ? 'good' : 'bad'}"><h4>${escapeHtml(uiText('ผลการตรวจโฟลเดอร์', 'Folder check'))}</h4><div class="path-line"><code>${escapeHtml(inspection.path || '')}</code></div><div class="pill-row">${pills}</div>${missing}</div>`;
  renderSettingsStatusSummary({ config: state.config, configInspection: inspection });
}

function commandStatusHint(info, kind){
  const fallback = kind === 'restart'
    ? uiText('ใช้สั่งรีสตาร์ตเซิร์ฟเวอร์จากแอป', 'Used to restart the server from this app.')
    : uiText('ใช้สั่งรีโหลดลูทหลังบันทึกหรือกด action', 'Used to reload loot after saves and actions.');
  if(!info?.configured) return uiText('ยังไม่ได้ตั้งคำสั่งนี้ ปุ่มที่ต้องใช้คำสั่งนี้จะถูกปิดไว้ก่อน', 'This command is not configured yet, so dependent actions stay disabled.');
  if(info.reason === 'directory') return uiText('ค่าที่ตั้งไว้เป็นโฟลเดอร์ ไม่ใช่คำสั่งรันได้', 'The configured value points to a folder, not a runnable command.');
  if(info.reason === 'missing_path') return uiText('หาไฟล์คำสั่งที่ตั้งไว้ไม่เจอ ตรวจ path หรือเครื่องหมาย quote อีกครั้ง', 'The configured command path was not found. Check the path and quoting.');
  if(info.reason === 'file') return uiText('พร้อมรันจาก path ไฟล์ที่ระบุไว้', 'Ready to run from the configured file path.');
  if(info.reason === 'shell_lookup') return uiText('พร้อมรันผ่าน shell ของระบบ', 'Ready to run through the system shell.');
  return fallback;
}

function commandFieldId(kind){
  return kind === 'restart' ? 'cfg-restart-cmd' : 'cfg-reload-cmd';
}

function commandConfigKey(kind){
  return kind === 'restart' ? 'restartServerCommand' : 'reloadLootCommand';
}

function commandTemplateValue(kind, template){
  const suffix = kind === 'restart' ? 'restart-server' : 'reload-loot';
  if(template === 'powershell') return `powershell -ExecutionPolicy Bypass -File "C:\\path\\to\\${suffix}.ps1"`;
  if(template === 'shell') return `"C:\\path\\to\\server-tool.exe" ${kind === 'restart' ? 'restart' : 'reload-loot'}`;
  return `cmd /c "C:\\path\\to\\${suffix}.cmd"`;
}

function commandTemplateMeta(kind){
  return [
    {
      key: 'cmd',
      label: uiText('.cmd / .bat template', '.cmd / .bat template'),
      hint: uiText('เหมาะกับ Windows ถ้าต้องสั่งหลายบรรทัดหรือมี env เพิ่ม', 'Good on Windows when you need multiple steps or env setup.')
    },
    {
      key: 'powershell',
      label: uiText('PowerShell template', 'PowerShell template'),
      hint: uiText('ใช้กับสคริปต์ .ps1 และค่อยเปลี่ยน path ให้เป็นของจริงในเครื่อง', 'Use for .ps1 scripts and replace the path with your real machine path.')
    },
    {
      key: 'shell',
      label: uiText('Executable template', 'Executable template'),
      hint: uiText('ใช้เมื่อมึงมี wrapper exe หรือ server tool ที่รับคำสั่งอยู่แล้ว', 'Use when you already have a wrapper exe or server tool with a command interface.')
    }
  ].map((entry) => ({ ...entry, value: commandTemplateValue(kind, entry.key) }));
}

function commandDraftState(kind){
  const field = $(commandFieldId(kind));
  const command = String(field?.value || '');
  const savedCommand = String(state.config?.[commandConfigKey(kind)] || '');
  const dirty = command.trim() !== savedCommand.trim();
  const draft = state.commandDraftHealth?.[kind];
  const inspection = draft && draft.command === command
    ? draft.inspection
    : (!dirty ? state.commandHealth?.[kind] : null);
  return { command, savedCommand, dirty, inspection };
}

function commandAssistAdvice(kind, view){
  const advice = [];
  if(!view.command.trim()){
    advice.push(uiText('ยังไม่มีคำสั่งจริงก็ปล่อยว่างไว้ได้ ปุ่มที่พึ่งคำสั่งนี้จะถูกปิดไว้ก่อน', 'Leave it empty until you have a real command. Dependent buttons stay disabled.'));
  } else if(view.dirty && !view.inspection){
    advice.push(uiText('คำสั่ง draft นี้ยังไม่ได้ตรวจ กด Check command ก่อน save จะปลอดภัยกว่า', 'This draft has not been checked yet. Press Check command before saving.'));
  } else if(view.inspection?.reason === 'directory'){
    advice.push(uiText('ค่าตอนนี้เป็น path โฟลเดอร์ ซึ่งรันไม่ได้ ต้องชี้ไปที่ไฟล์ .cmd/.bat/.ps1 หรือ executable', 'The current value is a folder path. Point to a .cmd/.bat/.ps1 file or an executable instead.'));
  } else if(view.inspection?.reason === 'missing_path'){
    advice.push(uiText('path ของไฟล์คำสั่งยังหาไม่เจอ ให้ตรวจชื่อไฟล์, quote และตำแหน่งจริงอีกครั้ง', 'The command path was not found. Check the filename, quoting, and real location again.'));
  } else if(view.inspection?.runnable){
    advice.push(uiText('รูปแบบคำสั่งนี้รันได้แล้ว ถ้าจะใช้จริงให้กด Save App Config เพื่ออัปเดตปุ่ม action ทั้งระบบ', 'This command shape is runnable. Save App Config to update action buttons across the app.'));
  }
  advice.push(kind === 'restart'
    ? uiText('ถ้าต้อง restart หลายขั้น ให้ห่อไว้ในไฟล์ .cmd ไฟล์เดียวจะอ่านง่ายสุด', 'If restart needs multiple steps, wrap them in a single .cmd file to keep this field readable.')
    : uiText('ถ้า reload ต้องยิง admin command หรือ RCON ให้ห่อไว้ในไฟล์ .cmd/.ps1 แล้วค่อยชี้มาที่ไฟล์นั้น', 'If reload needs an admin command or RCON call, wrap it in a .cmd/.ps1 script and point this field at that file.'));
  return advice;
}

function renderCommandAssist(){
  const host = $('settings-command-assist');
  if(!host) return;
  if($('cfg-reload-cmd')) $('cfg-reload-cmd').placeholder = 'cmd /c "C:\\path\\to\\reload-loot.cmd"';
  if($('cfg-restart-cmd')) $('cfg-restart-cmd').placeholder = 'cmd /c "C:\\path\\to\\restart-server.cmd"';
  const cards = ['reload', 'restart'].map((kind) => {
    const title = kind === 'restart' ? t('restartServerCommand') : t('reloadLootCommand');
    const view = commandDraftState(kind);
    const inspection = view.inspection;
    let tone = 'bad';
    let status = uiText('ต้องเช็ก', 'Needs attention');
    if(!view.command.trim()){
      status = uiText('ยังไม่ตั้ง', 'Not set');
    } else if(view.dirty && !inspection){
      tone = 'pending';
      status = uiText('draft ยังไม่เช็ก', 'Draft not checked');
    } else if(inspection?.runnable){
      tone = 'good';
      status = view.dirty ? uiText('draft ผ่าน', 'Draft looks good') : uiText('พร้อม', 'Ready');
    }
    const hint = view.dirty && !inspection
      ? uiText('คำสั่งนี้ต่างจากค่าที่เซฟไว้แล้ว แต่ยังไม่ได้ตรวจความถูกต้อง', 'This draft differs from the saved value but has not been checked yet.')
      : commandStatusHint(inspection, kind);
    const advice = commandAssistAdvice(kind, view);
    const templates = commandTemplateMeta(kind);
    return `<div class="command-assist-card ${tone}"><div class="section-head compact"><div><h4>${escapeHtml(title)}</h4><p class="muted">${escapeHtml(hint)}</p></div><span class="pill ${tone === 'good' ? 'good' : tone === 'bad' ? 'bad' : ''}">${escapeHtml(status)}</span></div><div class="command-assist-meta"><div class="path-line">${view.command.trim() ? `<code>${escapeHtml(view.command)}</code>` : `<span class="muted">${escapeHtml(uiText('ยังไม่ได้กำหนดคำสั่ง', 'No command set yet.'))}</span>`}</div><ul class="setup-list compact-list">${advice.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div><div class="actions tight wrap"><button class="ghost tiny" data-check-command="${kind}">${escapeHtml(uiText('Check command', 'Check command'))}</button><button class="ghost tiny" data-clear-command="${kind}">${escapeHtml(uiText('ล้างช่องนี้', 'Clear field'))}</button></div><details class="command-example-box"><summary>${escapeHtml(uiText('ดูรูปแบบคำสั่งที่ใส่ได้', 'See valid command formats'))}</summary><div class="command-example-grid">${templates.map((template) => `<div class="command-template-card"><strong>${escapeHtml(template.label)}</strong><div class="muted small">${escapeHtml(template.hint)}</div><code>${escapeHtml(template.value)}</code><div class="actions tight"><button class="ghost tiny" data-command-template="${kind}" data-template-kind="${template.key}">${escapeHtml(uiText('ใช้ template นี้', 'Use this template'))}</button></div></div>`).join('')}</div></details></div>`;
  }).join('');
  host.innerHTML = `<div class="command-assist-grid">${cards}</div>`;
  document.querySelectorAll('[data-check-command]').forEach((button) => {
    button.onclick = () => checkCommandDraft(button.dataset.checkCommand);
  });
  document.querySelectorAll('[data-clear-command]').forEach((button) => {
    button.onclick = () => {
      const kind = button.dataset.clearCommand;
      const field = $(commandFieldId(kind));
      if(field) field.value = '';
      state.commandDraftHealth[kind] = null;
      renderCommandAssist();
    };
  });
  document.querySelectorAll('[data-command-template]').forEach((button) => {
    button.onclick = () => useCommandTemplate(button.dataset.commandTemplate, button.dataset.templateKind);
  });
}

async function checkCommandDraft(kind){
  const field = $(commandFieldId(kind));
  const command = String(field?.value || '');
  const data = await api('/api/command/check', { method: 'POST', body: JSON.stringify({ kind, command }) });
  state.commandDraftHealth[kind] = { command, inspection: data.inspection };
  renderCommandAssist();
  showToast(data.inspection?.runnable ? uiText('ตรวจคำสั่งแล้ว ใช้งานได้', 'Command looks runnable') : uiText('ตรวจคำสั่งแล้ว ยังต้องแก้อีกนิด', 'Command checked, still needs changes'), !data.inspection?.runnable);
}

function useCommandTemplate(kind, templateKind){
  const field = $(commandFieldId(kind));
  if(!field) return;
  field.value = commandTemplateValue(kind, templateKind);
  state.commandDraftHealth[kind] = null;
  renderCommandAssist();
  field.focus();
  field.setSelectionRange(0, field.value.length);
}

function applyCommandActionState(){
  const reloadReady = !!state.commandHealth?.reload?.runnable;
  const restartReady = !!state.commandHealth?.restart?.runnable;
  const setDisabled = (id, disabled, title) => {
    const el = $(id);
    if(!el) return;
    el.disabled = !!disabled;
    if(disabled) el.title = title || '';
    else el.removeAttribute('title');
  };
  const reloadHint = commandStatusHint(state.commandHealth?.reload, 'reload');
  const restartHint = commandStatusHint(state.commandHealth?.restart, 'restart');
  ['global-reload','save-server-parsed-reload','loot-save-reload','profile-apply','rotation-run'].forEach((id)=>setDisabled(id, !reloadReady, reloadHint));
  setDisabled('global-restart', !restartReady, restartHint);
}

function renderSettingsStatusSummary(data){
  const el = $('settings-status-summary');
  if(!el) return;
  const config = data?.config || state.config || {};
  const inspection = data?.configInspection || state.configInspection;
  const commandHealth = data?.commandHealth || state.commandHealth || {};
  if(!inspection){
    el.innerHTML = '';
    applyCommandActionState();
    return;
  }
  const rows = [
    {
      label: uiText('Config root', 'Config root'),
      path: inspection.rootPath || config.scumConfigDir || '',
      good: !!inspection.rootExists,
      hint: uiText('ใช้สำหรับไฟล์ ServerSettings, GameUser และ Economy', 'Used for ServerSettings, GameUser, and Economy files.')
    },
    {
      label: uiText('Nodes folder', 'Nodes folder'),
      path: inspection.nodesPath || config.nodesDir || '',
      good: !!inspection.nodesExists,
      hint: inspection.usingCustomNodesDir ? uiText('กำลังใช้ path แบบกำหนดเอง', 'Using a custom path.') : uiText('ถ้าไม่กำหนดเองจะใช้ Nodes ใต้ config root', 'Falls back to Nodes under the config root.')
    },
    {
      label: uiText('Spawners folder', 'Spawners folder'),
      path: inspection.spawnersPath || config.spawnersDir || '',
      good: !!inspection.spawnersExists,
      hint: inspection.usingCustomSpawnersDir ? uiText('กำลังใช้ path แบบกำหนดเอง', 'Using a custom path.') : uiText('ถ้าไม่กำหนดเองจะใช้ Spawners ใต้ config root', 'Falls back to Spawners under the config root.')
    },
    {
      label: uiText('Reload command', 'Reload command'),
      path: commandHealth.reload?.command || config.reloadLootCommand || '',
      good: !!commandHealth.reload?.runnable,
      hint: commandStatusHint(commandHealth.reload, 'reload')
    },
    {
      label: uiText('Restart command', 'Restart command'),
      path: commandHealth.restart?.command || config.restartServerCommand || '',
      good: !!commandHealth.restart?.runnable,
      hint: commandStatusHint(commandHealth.restart, 'restart')
    }
  ];
  el.innerHTML = rows.map((row)=>`<div class="status-panel ${row.good ? 'good' : 'bad'}"><div class="info-pair"><strong>${escapeHtml(row.label)}</strong><span class="pill ${row.good ? 'good' : 'bad'}">${escapeHtml(row.good ? uiText('พร้อม', 'Ready') : uiText('ต้องเช็ก', 'Needs attention'))}</span></div><div class="path-line">${row.path ? `<code>${escapeHtml(row.path)}</code>` : `<span class="muted">${escapeHtml(uiText('ยังไม่ได้กำหนด', 'Not configured yet.'))}</span>`}</div><div class="muted">${escapeHtml(row.hint)}</div></div>`).join('');
  renderCommandAssist();
  applyCommandActionState();
}

function renderConfigDiscovery(data){
  state.configDiscovery = data || null;
  const el = $('settings-discovery-results');
  if(!el) return;
  if(!data){
    el.innerHTML = '';
    return;
  }
  const found = data?.found || [];
  if(!found.length){
    el.innerHTML = `<div class="path-result bad"><h4>${escapeHtml(uiText('หาโฟลเดอร์อัตโนมัติ', 'Likely SCUM folders'))}</h4><div class="muted">${escapeHtml(uiText('ยังไม่เจอโฟลเดอร์ SCUM ใน path มาตรฐานของ Windows ให้ลองวาง path เองแล้วกดตรวจโฟลเดอร์', 'No likely SCUM config folders were found in common Windows locations. Paste a path manually and use Check folder.'))}</div></div>`;
    return;
  }
  el.innerHTML = found.map((inspection)=>`<div class="path-result ${inspection.ready ? 'good' : 'bad'}"><h4>${escapeHtml(inspection.ready ? uiText('โฟลเดอร์ที่พร้อมใช้งาน', 'Ready folder') : uiText('โฟลเดอร์ที่เจอ', 'Found folder'))}</h4><div class="path-line"><code>${escapeHtml(inspection.path)}</code></div><div class="pill-row"><span class="pill ${inspection.ready ? 'good' : 'bad'}">${escapeHtml(inspection.ready ? uiText('พร้อมแก้ไฟล์', 'Ready for editing') : uiText('เจอ path แต่ไฟล์ยังไม่ครบ', 'Path exists but required files are missing'))}</span></div><div class="path-actions"><button data-use-config-path="${escapeHtml(inspection.path)}">${escapeHtml(uiText('ใช้ path นี้', 'Use this path'))}</button><button data-check-config-path="${escapeHtml(inspection.path)}" class="ghost">${escapeHtml(uiText('ตรวจซ้ำ', 'Check again'))}</button></div></div>`).join('');
  document.querySelectorAll('[data-use-config-path]').forEach((button)=>button.onclick=()=>applyDiscoveredPath(button.dataset.useConfigPath));
  document.querySelectorAll('[data-check-config-path]').forEach((button)=>button.onclick=()=>checkConfigFolder(button.dataset.checkConfigPath));
}

function clearWorkspaceViews(){
  const message = uiText('ตั้งค่าโฟลเดอร์ SCUM ใน App Settings ก่อน', 'Set a valid SCUM config folder in App Settings first.');
  const muted = `<div class="muted">${escapeHtml(message)}</div>`;
  state.lootFiles = { nodes: [], spawners: [] };
  state.graph = { nodes: [], edges: [], neighborhood: [], focus: null };
  state.analyzer = null;
  state.parsedServer = null;
  state.selectedLootPath = '';
  $('stat-nodes').textContent='-';
  $('stat-spawners').textContent='-';
  if($('preset-list')) $('preset-list').innerHTML='';
  if($('parsed-server-grid')) $('parsed-server-grid').innerHTML=muted;
  if($('nodes-list')) $('nodes-list').innerHTML=muted;
  if($('spawners-list')) $('spawners-list').innerHTML=muted;
  if($('loot-summary')) $('loot-summary').innerHTML=muted;
  if($('loot-validation')) $('loot-validation').innerHTML=muted;
  if($('loot-deps')) $('loot-deps').innerHTML=muted;
  if($('simulate-output')) $('simulate-output').textContent=message;
  if($('visual-builder')) $('visual-builder').innerHTML=muted;
  if($('loot-editor')) $('loot-editor').value='';
  if($('analyzer-stats')) $('analyzer-stats').innerHTML=muted;
  if($('analyzer-categories')) $('analyzer-categories').innerHTML='';
  if($('analyzer-missing')) $('analyzer-missing').innerHTML=muted;
  if($('analyzer-unused')) $('analyzer-unused').innerHTML=muted;
  if($('analyzer-top-items')) $('analyzer-top-items').innerHTML=muted;
  if($('graph-canvas')) $('graph-canvas').innerHTML=muted;
  if($('graph-focus-summary')) $('graph-focus-summary').innerHTML=muted;
  state.lootUi.dirty = false;
  updateLootWorkspaceLayout();
  updateLootWorkspaceCopy();
}

function clearLootViews(message = uiText('ตั้งค่า Nodes และ Spawners folder ให้ถูกก่อน แล้วหน้าลูทกับ analyzer จะเริ่มทำงาน', 'Configure valid Nodes and Spawners folders first. Loot, analyzer, and graph pages will start working once both paths are valid.')){
  const muted = `<div class="muted">${escapeHtml(message)}</div>`;
  state.lootFiles = { nodes: [], spawners: [] };
  state.itemCatalog = { items: [], categories: [], total: 0 };
  state.itemCatalogSearch = '';
  state.itemCatalogCategory = '__all';
  state.nodeRefCatalog = { refs: [], nodes: [], total: 0 };
  state.nodeRefSearch = '';
  state.nodeRefNodeFilter = '__all';
  state.treeSearch = '';
  state.focusedLootField = null;
  state.graph = { nodes: [], edges: [], neighborhood: [], focus: null };
  state.analyzer = null;
  state.selectedLootPath = '';
  $('stat-nodes').textContent='-';
  $('stat-spawners').textContent='-';
  if($('nodes-list')) $('nodes-list').innerHTML=muted;
  if($('spawners-list')) $('spawners-list').innerHTML=muted;
  if($('loot-summary')) $('loot-summary').innerHTML=muted;
  if($('loot-validation')) $('loot-validation').innerHTML=muted;
  if($('loot-deps')) $('loot-deps').innerHTML=muted;
  if($('simulate-output')) $('simulate-output').textContent=message;
  if($('visual-builder')) $('visual-builder').innerHTML=muted;
  if($('loot-editor')) $('loot-editor').value='';
  if($('analyzer-stats')) $('analyzer-stats').innerHTML=muted;
  if($('analyzer-categories')) $('analyzer-categories').innerHTML='';
  if($('analyzer-missing')) $('analyzer-missing').innerHTML=muted;
  if($('analyzer-unused')) $('analyzer-unused').innerHTML=muted;
  if($('analyzer-top-items')) $('analyzer-top-items').innerHTML=muted;
  if($('graph-canvas')) $('graph-canvas').innerHTML=muted;
  if($('graph-focus-summary')) $('graph-focus-summary').innerHTML=muted;
  state.lootUi.dirty = false;
  updateLootWorkspaceLayout();
  updateLootWorkspaceCopy();
}

function renderLootEmptyState(){
  if(state.selectedLootPath) return;
  if($('loot-summary')) $('loot-summary').innerHTML = `<div class="muted">${escapeHtml(uiText('เลือกไฟล์ลูทก่อนเพื่อดูสรุป', 'Select a loot file to inspect it.'))}</div>`;
  if($('loot-validation')) $('loot-validation').innerHTML = `<div class="muted">${escapeHtml(uiText('เลือกไฟล์ลูทก่อนเพื่อดู validation', 'Select a loot file to see validation.'))}</div>`;
  if($('loot-deps')) $('loot-deps').innerHTML = `<div class="muted">${escapeHtml(uiText('เลือกไฟล์ลูทก่อนเพื่อดูความสัมพันธ์', 'Select a loot file to see dependencies.'))}</div>`;
  if($('simulate-output')) $('simulate-output').textContent = uiText('เลือกไฟล์ลูทก่อนแล้วค่อยรัน simulator', 'Select a loot file before running the simulator.');
  if($('visual-builder')) $('visual-builder').innerHTML = `<div class="muted">${escapeHtml(uiText('เลือกไฟล์ลูทจากรายการด้านซ้ายก่อน', 'Select a loot file from the list on the left.'))}</div>`;
  updateLootWorkspaceLayout();
  updateLootWorkspaceCopy();
}

async function loadBootstrap(){
  const data = await api('/api/bootstrap');
  state.bootstrap=data; state.config=data.config; state.presets=data.presets||{}; state.rotation=data.rotation||state.rotation; state.configInspection=data.configInspection||null; state.commandHealth=data.commandHealth||state.commandHealth; state.commandDraftHealth={ reload:null, restart:null };
  $('cfg-scum-dir').value=data.config.scumConfigDir||''; $('cfg-backup-dir').value=data.config.backupDir||''; $('cfg-nodes-dir').value=data.config.nodesDir||''; $('cfg-spawners-dir').value=data.config.spawnersDir||''; $('cfg-reload-cmd').value=data.config.reloadLootCommand||''; $('cfg-restart-cmd').value=data.config.restartServerCommand||''; $('cfg-autobackup').checked=!!data.config.autoBackupCoreOnStart;
  $('stat-config').textContent=data.config.scumConfigDir||'Not set'; $('stat-backups').textContent=data.config.backupDir||'-';
  renderHealth(data); renderSetupNotice(data); renderSettingsStatusSummary(data); renderConfigInspection(data.configInspection || null); renderConfigDiscovery(state.configDiscovery); if(!data.health?.ready && !state.configDiscovery) discoverConfigFolders(true).catch(()=>{}); if($('rotation-status') && data.rotation){ $('rotation-status').textContent = `${t('nextRun')}: ${data.rotation.nextRunAt ? fmtDate(data.rotation.nextRunAt) : t('notScheduled')}`; } setStatus(!!data.health?.ready, data.health?.ready ? t('ready') : (data.health?.configPathExists ? uiText('ตั้งค่าไม่ครบ', 'Setup incomplete') : t('configPathNotSet'))); applyTranslations(); updateLootWorkspaceLayout(); updateLootWorkspaceCopy();
}
async function saveConfig(){
  const payload={ scumConfigDir:$('cfg-scum-dir').value.trim(), nodesDir:$('cfg-nodes-dir').value.trim(), spawnersDir:$('cfg-spawners-dir').value.trim(), backupDir:$('cfg-backup-dir').value.trim(), reloadLootCommand:$('cfg-reload-cmd').value, restartServerCommand:$('cfg-restart-cmd').value, autoBackupCoreOnStart:$('cfg-autobackup').checked };
  await api('/api/config',{method:'PUT',body:JSON.stringify(payload)}); showToast(t('savedAppConfig')); await refreshAll();
}
async function checkConfigFolder(pathOverride=''){
  const path = String(pathOverride || $('cfg-scum-dir').value || '').trim();
  if(pathOverride) $('cfg-scum-dir').value = pathOverride;
  const nodesPath = String($('cfg-nodes-dir')?.value || '').trim();
  const spawnersPath = String($('cfg-spawners-dir')?.value || '').trim();
  const data = await api(`/api/config/check?path=${encodeURIComponent(path)}&nodesPath=${encodeURIComponent(nodesPath)}&spawnersPath=${encodeURIComponent(spawnersPath)}`);
  renderConfigInspection(data.inspection);
  showToast(uiText('ตรวจโฟลเดอร์เรียบร้อย', 'Folder check complete'));
}
async function discoverConfigFolders(silent=false){
  const data = await api('/api/config/discover');
  renderConfigDiscovery(data);
  if(!silent) showToast(uiText('โหลดรายการโฟลเดอร์ที่น่าจะใช่แล้ว', 'Likely folders loaded'));
}
async function applyDiscoveredPath(configPath){
  $('cfg-scum-dir').value = configPath;
  $('cfg-nodes-dir').value = '';
  $('cfg-spawners-dir').value = '';
  await saveConfig();
}
async function runAction(endpoint){ const data = await api(endpoint,{method:'POST',body:'{}'}); writeConsole(data.result?.output||'Done.'); showToast(data.result?.ok?t('commandFinished'):t('commandWarn')); }
async function backupCore(){ const data=await api('/api/backup',{method:'POST',body:JSON.stringify({})}); showToast(`${t('backupCreated')}: ${data.backupPath}`); await loadBackups(); }

async function loadParsedServerSettings(){
  try {
    const data=await api('/api/server-settings/parsed');
    state.parsedServer=data.parsed;
    state.presets=data.presets||{};
    renderPresets();
    renderParsedServerGrid();
  } catch (error) {
    state.parsedServer = null;
    if($('server-section-summary')) $('server-section-summary').innerHTML = `<div class="card stat compact"><span class="stat-label">Status</span><strong>${escapeHtml(uiText('ยังโหลดไม่ได้', 'Unavailable'))}</strong></div>`;
    if($('preset-list')) $('preset-list').innerHTML = '';
    if($('parsed-server-grid')) $('parsed-server-grid').innerHTML = `<div class="section-card"><div class="muted">${escapeHtml(uiText('ยังโหลด ServerSettings.ini ไม่ได้ ตรวจ path config root หรือดูว่าไฟล์นี้มีอยู่จริงก่อน', 'ServerSettings.ini is not available yet. Check the config root and make sure the file exists.'))}</div></div>`;
    throw error;
  }
}
function renderPresets(){ $('preset-list').innerHTML=Object.entries(state.presets).map(([id,p])=>`<div class="preset-card"><h4>${escapeHtml(p.label)}</h4><p class="muted">${escapeHtml(p.description)}</p><div class="actions tight"><button data-preview-preset="${id}" class="ghost tiny">Preview</button><button data-apply-preset="${id}" class="tiny">Apply</button></div></div>`).join(''); document.querySelectorAll('[data-preview-preset]').forEach((b)=>b.onclick=()=>applyPreset(b.dataset.previewPreset,false)); document.querySelectorAll('[data-apply-preset]').forEach((b)=>b.onclick=()=>applyPreset(b.dataset.applyPreset,true)); }
function splitServerKeyWords(key){
  return String(key || '')
    .replace(/^scum\./i, '')
    .replace(/[_.-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}
function titleCaseWords(words){ return words.map((word)=>word.charAt(0).toUpperCase() + word.slice(1)).join(' '); }
function prettyServerKey(key){ const words = splitServerKeyWords(key); return words.length ? titleCaseWords(words) : String(key || ''); }
function serverGroupLabel(key){
  const words = splitServerKeyWords(key);
  if(!words.length) return 'General';
  const generic = new Set(['scum', 'enable', 'disable', 'max', 'min']);
  const filtered = words.filter((word)=>!generic.has(word.toLowerCase()));
  const picked = (filtered.length ? filtered : words).slice(0, 2);
  return titleCaseWords(picked) || 'General';
}
function parsedServerSummary(parsed){
  const sections = Object.entries(parsed || {}).filter(([, fields]) => fields && typeof fields === 'object');
  return {
    sectionCount: sections.length,
    fieldCount: sections.reduce((sum, [, fields]) => sum + Object.keys(fields || {}).length, 0)
  };
}
function buildServerSections(parsed, term=''){
  return Object.entries(parsed || {})
    .filter(([, fields])=>fields && typeof fields === 'object' && !Array.isArray(fields))
    .map(([section, fields])=>{
      const entries = Object.entries(fields || {}).map(([key, value])=>({
        key,
        value,
        group: serverGroupLabel(key)
      })).filter((entry)=>!term || `${section} ${entry.group} ${entry.key} ${entry.value}`.toLowerCase().includes(term));
      if(!entries.length) return null;
      const grouped = {};
      entries.forEach((entry)=>{
        (grouped[entry.group] ||= []).push(entry);
      });
      const groups = Object.entries(grouped).sort((a,b)=>a[0].localeCompare(b[0])).map(([group, groupEntries])=>({ group, entries: groupEntries }));
      return { section, groups, entryCount: entries.length };
    })
    .filter(Boolean)
    .sort((a,b)=>a.section.localeCompare(b.section));
}
function syncServerFilterOptions(allSections, selectedSection, selectedGroup){
  const sectionSelect = $('server-section-filter');
  const groupSelect = $('server-group-filter');
  if(sectionSelect){
    const nextSection = allSections.some((section)=>section.section === selectedSection) ? selectedSection : '__all';
    sectionSelect.innerHTML = `<option value="__all">${escapeHtml(uiText('ทุกหมวด', 'All sections'))}</option>${allSections.map((section)=>`<option value="${escapeHtml(section.section)}">${escapeHtml(section.section)}</option>`).join('')}`;
    sectionSelect.value = nextSection;
    selectedSection = nextSection;
  }
  if(groupSelect){
    const groupNames = Array.from(new Set((selectedSection !== '__all' ? (allSections.find((section)=>section.section === selectedSection)?.groups || []) : allSections.flatMap((section)=>section.groups)).map((group)=>group.group))).sort((a,b)=>a.localeCompare(b));
    const nextGroup = groupNames.includes(selectedGroup) ? selectedGroup : '__all';
    groupSelect.innerHTML = `<option value="__all">${escapeHtml(uiText('ทุกกลุ่ม', 'All groups'))}</option>${groupNames.map((group)=>`<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`).join('')}`;
    groupSelect.value = nextGroup;
    selectedGroup = nextGroup;
  }
  return { selectedSection, selectedGroup };
}
function booleanFieldMeta(value){
  const raw = String(value ?? '').trim();
  const lower = raw.toLowerCase();
  if(lower !== 'true' && lower !== 'false') return null;
  const capitalized = raw === 'True' || raw === 'False';
  return {
    current: lower,
    trueValue: capitalized ? 'True' : 'true',
    falseValue: capitalized ? 'False' : 'false'
  };
}
function serverFieldKind(value){
  if(booleanFieldMeta(value)) return 'boolean';
  const raw = String(value ?? '').trim();
  return raw !== '' && /^-?\d+(\.\d+)?$/.test(raw) ? 'number' : 'text';
}
function serverFieldExplanation(key, value){
  const normalized = String(key || '').toLowerCase();
  const kind = serverFieldKind(value);
  if(normalized.includes('maxplayers')) return uiText('จำนวนผู้เล่นสูงสุดที่เซิร์ฟเวอร์รับได้ ปรับแล้วควรเช็ก performance ด้วย', 'Maximum players the server accepts. Check performance after changing it.');
  if(normalized.includes('allowmapscreen')) return uiText('เปิดหรือปิดหน้าจอแผนที่ของผู้เล่น', 'Turns the player map screen on or off.');
  if(normalized.includes('allowglobalchat')) return uiText('เปิดหรือปิดแชตรวมของเซิร์ฟเวอร์', 'Turns global server chat on or off.');
  if(normalized.includes('allowthirdperson')) return uiText('อนุญาตมุมมองบุคคลที่สาม ถ้าต้องการ hardcore มักปิดค่านี้', 'Allows third-person camera. Hardcore servers often disable this.');
  if(normalized.includes('allowfirstperson')) return uiText('อนุญาตมุมมองบุคคลที่หนึ่ง ปกติควรเปิดไว้', 'Allows first-person camera. Usually this should stay enabled.');
  if(normalized.includes('famegain')) return uiText('ตัวคูณ Fame ยิ่งสูงยิ่งเก็บแต้มเร็ว', 'Fame multiplier. Higher values make fame progress faster.');
  if(normalized.includes('logout')) return uiText('เวลาหรือกติกาที่เกี่ยวกับการออกจากเกม ใช้กัน combat logging', 'Logout timing or behavior. Useful for reducing combat logging.');
  if(normalized.includes('puppet')) return uiText('จำนวนหรือพฤติกรรม puppet/zombie ส่งผลกับความยากและ performance', 'Puppet/zombie amount or behavior. Affects difficulty and performance.');
  if(normalized.includes('sentry')) return uiText('จำนวนหรือพฤติกรรมหุ่น sentry ส่งผลกับพื้นที่ military และ performance', 'Sentry amount or behavior. Affects military areas and performance.');
  if(normalized.includes('damage')) return uiText('ค่าความเสียหายหรือสภาพไอเท็ม แก้ทีละน้อยแล้วทดสอบในเกม', 'Damage or item condition value. Change in small steps and test in game.');
  if(normalized.includes('time')) return uiText('ค่าที่เกี่ยวกับเวลาในเกม เช่น รอบกลางวัน/กลางคืน หรือ cooldown', 'Time-related value such as day/night pacing or cooldowns.');
  if(kind === 'boolean') return uiText('เลือกเปิดหรือปิด ไม่ต้องพิมพ์ True/False เอง', 'Choose enabled or disabled instead of typing True/False manually.');
  if(kind === 'number') return uiText('ค่าเป็นตัวเลข แนะนำให้แก้ทีละน้อยแล้ว Preview Diff ก่อนบันทึก', 'Numeric value. Change gradually and inspect Preview Diff before saving.');
  return uiText('ค่าแบบข้อความ คงรูปแบบเดิมไว้ถ้าไม่แน่ใจว่าระบบต้องการอะไร', 'Text value. Keep the existing format if you are not sure what the server expects.');
}
function renderServerGuidePanel(summary, visibleFieldCount){
  return `<div class="server-guide-panel"><div><strong>${escapeHtml(uiText('เริ่มจากหมวดเดียวก่อน', 'Start with one section first'))}</strong><p class="muted">${escapeHtml(uiText('ใช้ dropdown เลือกหมวด/กลุ่ม แล้วค่อยแก้เฉพาะค่าที่รู้ผลกระทบ ช่วยให้หน้าไม่รกและลดโอกาสแก้ผิดช่อง', 'Use the section and group dropdowns first, then edit only values whose impact you understand. This keeps the page readable and reduces wrong edits.'))}</p></div><div class="server-guide-steps"><span class="tag">${escapeHtml(`${visibleFieldCount}/${summary.fieldCount} ${uiText('ฟิลด์ที่เห็น', 'visible fields')}`)}</span><span class="tag">${escapeHtml(uiText('True/False เป็นตัวเลือก', 'True/False uses selects'))}</span><span class="tag">${escapeHtml(uiText('ดูคำอธิบายใต้ช่อง', 'Read the hint under each field'))}</span></div></div>`;
}
function renderServerValueControl(section, entry){
  const booleanMeta = booleanFieldMeta(entry.value);
  if(booleanMeta){
    return `<select class="field-input server-boolean-select" data-field-kind="boolean" data-server-section="${escapeHtml(section)}" data-server-key="${escapeHtml(entry.key)}"><option value="${escapeHtml(booleanMeta.trueValue)}"${booleanMeta.current === 'true' ? ' selected' : ''}>${escapeHtml(uiText('เปิด (True)', 'Enabled (True)'))}</option><option value="${escapeHtml(booleanMeta.falseValue)}"${booleanMeta.current === 'false' ? ' selected' : ''}>${escapeHtml(uiText('ปิด (False)', 'Disabled (False)'))}</option></select>`;
  }
  const kind = serverFieldKind(entry.value);
  const type = kind === 'number' ? 'number' : 'text';
  const step = kind === 'number' ? ' step="any"' : '';
  return `<input class="field-input" data-field-kind="${escapeHtml(kind)}" data-server-section="${escapeHtml(section)}" data-server-key="${escapeHtml(entry.key)}" type="${type}"${step} value="${escapeHtml(String(entry.value))}" />`;
}
function renderParsedServerGrid(){
  if(!state.parsedServer) return;
  const term=($('server-field-filter').value||'').toLowerCase().trim();
  const selectedSectionValue = $('server-section-filter')?.value || '__all';
  const selectedGroupValue = $('server-group-filter')?.value || '__all';
  const allSections = buildServerSections(state.parsedServer, '');
  const { selectedSection, selectedGroup } = syncServerFilterOptions(allSections, selectedSectionValue, selectedGroupValue);
  const sections = buildServerSections(state.parsedServer, term)
    .filter((section)=>selectedSection === '__all' || section.section === selectedSection)
    .map((section)=>({
      ...section,
      groups: section.groups.filter((group)=>selectedGroup === '__all' || group.group === selectedGroup)
    }))
    .filter((section)=>section.groups.length);
  const summary = parsedServerSummary(state.parsedServer);
  const visibleFieldCount = sections.reduce((sum, section)=>sum + section.groups.reduce((groupSum, group)=>groupSum + group.entries.length, 0), 0);
  const groupCount = sections.reduce((sum, section)=>sum + section.groups.length, 0);
  if($('server-section-summary')) $('server-section-summary').innerHTML = [
    { label: uiText('หมวดทั้งหมด', 'Sections'), value: summary.sectionCount },
    { label: uiText('กลุ่มที่แสดง', 'Visible groups'), value: groupCount },
    { label: uiText(term || selectedSection !== '__all' || selectedGroup !== '__all' ? 'ฟิลด์ที่เห็น' : 'ฟิลด์ทั้งหมด', term || selectedSection !== '__all' || selectedGroup !== '__all' ? 'Visible fields' : 'Fields'), value: term || selectedSection !== '__all' || selectedGroup !== '__all' ? visibleFieldCount : summary.fieldCount },
    { label: uiText('พรีเซ็ต', 'Presets'), value: Object.keys(state.presets || {}).length }
  ].map((item)=>`<div class="card stat compact"><span class="stat-label">${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`).join('');
  const serverGuide = renderServerGuidePanel(summary, visibleFieldCount);
  $('parsed-server-grid').innerHTML = sections.length ? serverGuide + sections.map(({ section, groups }, sectionIndex)=>{
    const groupCards = groups.map((group)=>`<div class="server-group"><div class="server-group-head"><h5>${escapeHtml(group.group)}</h5><span class="tag">${group.entries.length}</span></div>${group.entries.map((entry)=>`<label class="field-card"><div class="field-meta"><strong>${escapeHtml(prettyServerKey(entry.key))}</strong><code class="field-key">${escapeHtml(entry.key)}</code><small class="server-field-help">${escapeHtml(serverFieldExplanation(entry.key, entry.value))}</small></div>${renderServerValueControl(section, entry)}</label>`).join('')}</div>`).join('');
    const sectionCount = groups.reduce((sum, group)=>sum + group.entries.length, 0);
    const open = term || selectedSection !== '__all' || selectedGroup !== '__all' || sectionIndex === 0 ? ' open' : '';
    return `<details class="section-card server-section-card"${open}><summary class="section-toggle"><div><h4>${escapeHtml(section)}</h4><p class="muted">${sectionCount} ${escapeHtml(uiText('ฟิลด์', 'fields'))}</p></div><span class="tag">${groups.length} ${escapeHtml(uiText('กลุ่ม', 'groups'))}</span></summary><div class="server-group-grid">${groupCards}</div></details>`;
  }).join('') : `<div class="section-card"><div class="muted">${escapeHtml(uiText('ไม่มีค่าตั้งค่าที่ตรงกับคำค้น', 'No settings matched the current filter.'))}</div></div>`;
  document.querySelectorAll('[data-server-key]').forEach((input)=>{
    const handler = (event)=>{ state.parsedServer[event.target.dataset.serverSection][event.target.dataset.serverKey]=event.target.value; };
    input.oninput = handler;
    input.onchange = handler;
  });
}
async function saveParsedServer(reloadAfter=false){ await api('/api/server-settings/parsed',{method:'PUT',body:JSON.stringify({parsed:state.parsedServer,reloadAfter})}); showToast(reloadAfter?t('serverSettingsSavedReload'):t('serverSettingsSaved')); }
async function applyPreset(id, apply){ const data=await api('/api/server-settings/preset',{method:'POST',body:JSON.stringify({presetId:id,apply,reloadAfter:apply})}); $('diff-output').textContent=data.patch||''; if(apply){ showToast(t('presetApplied')); await loadParsedServerSettings(); } setView('diff'); }

async function openCoreFile(path){
  state.selectedCorePath=path;
  try {
    const data=await api(`/api/file?path=${encodeURIComponent(path)}`);
    state.currentCoreContent=data.content;
    $('core-editor').value=data.content;
    $('core-file-title').textContent=path;
    $('core-file-meta').innerHTML=`<div class="info-pair"><span>${t('updated')}</span><strong>${fmtDate(data.meta.updatedAt)}</strong></div><div class="info-pair"><span>${t('size')}</span><strong>${data.meta.size} ${t('bytes')}</strong></div>`;
    $('core-file-validation').innerHTML=renderValidation(data.validation);
    renderCoreFileList();
  } catch (error) {
    state.currentCoreContent = '';
    $('core-editor').value='';
    $('core-file-title').textContent=path;
    $('core-file-meta').innerHTML=`<div class="muted">${escapeHtml(uiText('ไฟล์นี้ยังไม่พร้อมใช้งานใน path ปัจจุบัน', 'This file is not available for the current config path.'))}</div>`;
    $('core-file-validation').innerHTML=`<div class="warn-card"><strong>${escapeHtml(uiText('ยังโหลดไม่ได้', 'Unavailable'))}</strong><div class="muted">${escapeHtml(error.message)}</div></div>`;
    renderCoreFileList();
    throw error;
  }
}
function renderCoreFileList(){ const files=['GameUserSettings.ini','EconomyOverride.json']; $('core-file-list').innerHTML=files.map((p)=>`<button class="file-item ${p===state.selectedCorePath?'active':''}" data-core-path="${p}"><strong>${p}</strong></button>`).join(''); document.querySelectorAll('[data-core-path]').forEach((b)=>b.onclick=()=>openCoreFile(b.dataset.corePath)); }
async function saveCoreFile(){ const content=$('core-editor').value; await api('/api/file',{method:'PUT',body:JSON.stringify({path:state.selectedCorePath,content})}); showToast(t('coreSaved')); state.currentCoreContent=content; await openCoreFile(state.selectedCorePath); }
async function previewDiff(path, content){ const data=await api('/api/file/diff',{method:'POST',body:JSON.stringify({path,content})}); $('diff-output').textContent=data.patch||''; setView('diff'); }

async function saveLoot(reloadAfter=false){
  if(!state.selectedLootPath) return showToast(uiText('เลือกไฟล์ลูทก่อน', 'Select a loot file first'), true);
  setLootSaveBusy(true);
  try {
    const content = $('loot-editor').classList.contains('hidden')
      ? fmtJson(state.currentLootObject || {})
      : $('loot-editor').value;
    const data = await api('/api/file', { method:'PUT', body: JSON.stringify({ path: state.selectedLootPath, content, reloadAfter }) });
    state.currentLootContent = content;
    state.lootUi.dirty = false;
    updateLootWorkspaceCopy();
    if(data.commandResult?.output) writeConsole(data.commandResult.output);
    showToast(reloadAfter ? uiText('บันทึกลูทและสั่งรีโหลดแล้ว', 'Loot saved and reload sent.') : uiText('บันทึกลูทแล้ว', 'Loot saved.'));
    await loadLootFiles();
    await openLootFile(state.selectedLootPath);
  } catch (error) {
    writeConsole(error.message || String(error));
    showToast(error.message || uiText('บันทึกลูทไม่สำเร็จ', 'Failed to save loot.'), true);
  } finally {
    setLootSaveBusy(false);
  }
}
async function loadLootFiles(){
  const data = await api('/api/loot/files');
  state.lootFiles = { nodes: data.nodes, spawners: data.spawners };
  $('stat-nodes').textContent = data.nodes.length;
  $('stat-spawners').textContent = data.spawners.length;
  renderLootLists();
  renderLootEmptyState();
}
function renderLootLists(){
  const term = ($('loot-search').value || '').toLowerCase();
  const filterList = (items) => items.filter((file) => !term || file.relPath.toLowerCase().includes(term) || (file.logicalName || '').toLowerCase().includes(term));
  $('nodes-list').innerHTML = filterList(state.lootFiles.nodes).map((file) => fileButton(file, file.relPath === state.selectedLootPath)).join('') || '<div class="muted">No node files</div>';
  $('spawners-list').innerHTML = filterList(state.lootFiles.spawners).map((file) => fileButton(file, file.relPath === state.selectedLootPath)).join('') || '<div class="muted">No spawner files</div>';
  document.querySelectorAll('[data-loot-path]').forEach((button) => {
    button.onclick = () => openLootFile(button.dataset.lootPath).catch((error)=>showToast(error.message || String(error), true));
  });
}
async function simulateLoot(){ const count=Number($('simulate-count').value||100); const data=await api('/api/loot/simulate',{method:'POST',body:JSON.stringify({path:state.selectedLootPath,count})}); const r=data.result; $('simulate-output').textContent=`Runs: ${r.count}\nAverage items/run: ${r.averageItemsPerRun}\n\nTop results:\n${r.distinctItems.slice(0,20).map(x=>`${x.name}: ${x.hits}`).join('\n')}\n\nSample runs:\n${r.sampleRuns.map((run,i)=>`${i+1}. ${run.join(', ')||'(empty)'}`).join('\n')}`; }
async function createLootFile(kind){ const fileName=prompt(`New ${kind} file name`); if(!fileName) return; await api('/api/loot/file',{method:'POST',body:JSON.stringify({kind,fileName})}); showToast(`Created ${kind} file`); await loadLootFiles(); }
async function cloneLootFile(){ if(!state.selectedLootPath) return showToast('Select a loot file first',true); const kind=state.selectedLootPath.startsWith('Nodes/')?'nodes':'spawners'; const fileName=prompt('Clone to file name'); if(!fileName) return; await api('/api/loot/clone',{method:'POST',body:JSON.stringify({sourcePath:state.selectedLootPath,kind,fileName})}); showToast('Loot file cloned'); await loadLootFiles(); }
async function deleteLootFile(){ if(!state.selectedLootPath) return showToast('Select a loot file first',true); if(!confirm(`Delete ${state.selectedLootPath}? Backup first.`)) return; await api(`/api/loot/file?path=${encodeURIComponent(state.selectedLootPath)}`,{method:'DELETE'}); showToast('Loot file deleted'); state.selectedLootPath=''; $('visual-builder').innerHTML=''; $('loot-editor').value=''; await loadLootFiles(); }
function makeKit(type){ if(type==='sniper') return { Name:'Sniper_KIT', Notes:'Generated sniper kit', Items:[{ClassName:'Weapon_AWM',Probability:1},{ClassName:'Ammo_338',Probability:1},{ClassName:'Ammo_338',Probability:1},{ClassName:'Scope',Probability:0.8}] }; if(type==='medical') return { Name:'Medical_KIT', Notes:'Generated medical kit', Items:[{ClassName:'Bandage',Probability:1},{ClassName:'Painkillers',Probability:1},{ClassName:'Antibiotics',Probability:0.6}] }; return { Name:'AK_KIT', Notes:'Generated AK kit', Items:[{ClassName:'Weapon_AK47',Probability:1},{ClassName:'AK47_Magazine',Probability:1},{ClassName:'AK47_Magazine',Probability:1},{ClassName:'Ammo_762x39',Probability:1}] }; }
function applyKit(type){ state.currentLootObject = makeKit(type); $('loot-editor').value = fmtJson(state.currentLootObject); renderVisualBuilder(); showToast(`${type.toUpperCase()} kit loaded into editor`); }

function fileButton(file, active){ return `<button class="file-item ${active?'active':''}" data-loot-path="${file.relPath}"><strong>${escapeHtml(file.logicalName||file.name)}</strong><span class="item-sub">${escapeHtml(file.relPath)}</span><span class="item-sub">${escapeHtml(lootFileBlurb(file.summary))}</span></button>`; }
async function openLootFile(path, options = {}){ if(path !== state.selectedLootPath && !confirmDiscardLootChanges(path)) { renderLootLists(); return; } state.selectedLootPath=path; if(!options.fromRoute && state.view === 'loot') updateRoute('loot', 'replace', { file: path }); state.focusedLootField = null; state.treeSearch = ''; state.itemCatalogSearch = ''; state.itemCatalogCategory = '__all'; state.nodeRefSearch = ''; state.nodeRefNodeFilter = '__all'; const data=await api(`/api/file?path=${encodeURIComponent(path)}`); state.currentLootContent=data.content; $('loot-editor').value=data.content; $('loot-editor-title').textContent=path; const analysis=await api(`/api/loot/analyze?path=${encodeURIComponent(path)}`); state.currentLootAnalysis=analysis; state.currentLootObject=analysis.object || {}; state.lootUi.treeFocusPath = 'root'; state.lootUi.itemCatalogOpen = false; state.lootUi.refCatalogOpen = false; state.lootUi.editorMode = 'visual'; state.lootUi.dirty = false; const kind = analysis.summary?.kind || 'unknown'; const totalNodes = analysis.summary?.totalNodes || 0; const groupCount = analysis.summary?.groupCount || 0; const itemCount = analysis.summary?.itemCount || 0; const nodeRefCount = analysis.summary?.nodeRefCount || 0; state.lootUi.compact = kind === 'node_tree' ? totalNodes > 18 : kind === 'spawner' ? (groupCount > 2 || nodeRefCount > 8) : itemCount > 1; state.lootUi.showGuides = !state.lootUi.compact && (totalNodes || groupCount || itemCount) <= 18; $('loot-summary').innerHTML=renderLootSummaryPanel(analysis.summary); $('loot-validation').innerHTML=renderValidation(analysis.validation); $('loot-deps').innerHTML=renderLootDependencyPanel(analysis); renderVisualBuilder(); setLootEditorMode('visual'); renderLootLists(); updateLootWorkspaceLayout(); updateLootWorkspaceCopy(); }
function syncVisualBuilderToRaw(){ $('loot-editor').value=fmtJson(state.currentLootObject || {}); state.currentLootContent=$('loot-editor').value; showToast(uiText('อัปเดต JSON ดิบแล้ว','Raw JSON updated')); }

function refreshLootItemDatalist(){
  const datalist = $('loot-item-options');
  if(!datalist) return;
  const items = (state.itemCatalog?.items || []).slice(0, 1200);
  datalist.innerHTML = items.map((item)=>`<option value="${escapeHtml(item.name)}"></option>`).join('');
}
function filteredItemCatalogItems(){
  const query = String(state.itemCatalogSearch || '').trim().toLowerCase();
  const category = state.itemCatalogCategory || '__all';
  return (state.itemCatalog?.items || []).filter((item)=>{
    if(category !== '__all' && item.category !== category) return false;
    if(!query) return true;
    const hay = `${item.name} ${item.category} ${(item.sampleSources || []).join(' ')}`.toLowerCase();
    return hay.includes(query);
  });
}
async function loadItemCatalog(){
  try {
    const data = await api('/api/items?limit=5000');
    state.itemCatalog = { items: data.items || [], categories: data.categories || [], total: data.total || 0 };
  } catch (error) {
    state.itemCatalog = { items: [], categories: [], total: 0 };
  }
  refreshLootItemDatalist();
}
function renderItemCatalogSection(mode){
  const items = filteredItemCatalogItems();
  const categories = state.itemCatalog?.categories || [];
  return `<div class="builder-section catalog-shell"><details class="catalog-panel" ${state.lootUi.itemCatalogOpen ? 'open' : ''}><summary class="section-head compact"><div><h4>${escapeHtml(mode === 'tree' ? uiText('Item catalog ?????? tree', 'Item catalog for tree nodes') : uiText('Item catalog', 'Item catalog'))}</h4><p class="muted">${escapeHtml(mode === 'tree' ? uiText('???????????????????? leaf ????????????????? ??????????????? leaf ????????????', 'Pick a real item for the focused leaf, or add it as a new leaf immediately.') : uiText('????????????????????????????? class name ???', 'Pick a real item instead of guessing the class name.'))}</p></div><div class="actions tight wrap"><span class="tag item">${escapeHtml(`${items.length}/${state.itemCatalog?.total || 0}`)}</span><button type="button" class="ghost tiny" data-item-catalog-toggle>${escapeHtml(state.lootUi.itemCatalogOpen ? uiText('???? catalog', 'Hide catalog') : uiText('???? catalog', 'Show catalog'))}</button></div></summary><div class="loot-inline-grid catalog-filter-grid"><label><span>${escapeHtml(uiText('???????????', 'Search items'))}</span><input id="item-catalog-search" value="${escapeHtml(state.itemCatalogSearch || '')}" placeholder="${escapeHtml(uiText('???????????????', 'Type an item name'))}" /></label><label><span>${escapeHtml(uiText('????', 'Category'))}</span><select id="item-catalog-category"><option value="__all">${escapeHtml(uiText('???????', 'All categories'))}</option>${categories.map((entry)=>`<option value="${escapeHtml(entry.id)}"${entry.id === state.itemCatalogCategory ? ' selected' : ''}>${escapeHtml(`${entry.id} (${entry.count})`)}</option>`).join('')}</select></label></div><datalist id="loot-item-options">${(state.itemCatalog?.items || []).slice(0, 1200).map((item)=>`<option value="${escapeHtml(item.name)}"></option>`).join('')}</datalist><div class="catalog-result-grid">${items.slice(0, 80).map((item)=>`<button type="button" class="result-card catalog-pick-card" data-catalog-pick="${escapeHtml(item.name)}"><strong>${escapeHtml(item.name)}</strong><div class="muted">${escapeHtml(`${item.category} · ${item.appearances} ${uiText('?????', 'hits')}`)}</div></button>`).join('') || `<div class="muted builder-empty">${escapeHtml(uiText('?????????????????????????????', 'No items matched this search.'))}</div>`}</div></details></div>`;
}
function bindItemCatalogControls(mode){
  const toggle = document.querySelector('[data-item-catalog-toggle]');
  if(toggle) toggle.onclick = ()=>{ state.lootUi.itemCatalogOpen = !state.lootUi.itemCatalogOpen; renderVisualBuilder(); };
  if($('item-catalog-search')) $('item-catalog-search').oninput = (event)=>{ state.itemCatalogSearch = event.target.value; renderVisualBuilder(); };
  if($('item-catalog-category')) $('item-catalog-category').onchange = (event)=>{ state.itemCatalogCategory = event.target.value; renderVisualBuilder(); };
  document.querySelectorAll('[data-catalog-pick]').forEach((button)=>{
    button.onclick = ()=>{
      const name = button.dataset.catalogPick || '';
      if(!name) return;
      const obj = state.currentLootObject || {};
      if(mode === 'tree'){
        if(state.focusedLootField?.kind === 'tree'){
          const node = getTreeNodeAtPath(obj, state.focusedLootField.path);
          if(node) node.Name = name;
        } else {
          obj.Children = Array.isArray(obj.Children) ? obj.Children : [];
          obj.Children.push({ Name: name, Rarity: obj.Rarity || 'Uncommon' });
        }
      } else {
        obj.Items = Array.isArray(obj.Items) ? obj.Items : [];
        if(state.focusedLootField?.kind === 'flat' && Number.isInteger(state.focusedLootField.index) && obj.Items[state.focusedLootField.index]){
          obj.Items[state.focusedLootField.index].ClassName = name;
        } else {
          obj.Items.push({ ClassName: name, Probability: 1 });
        }
      }
      renderVisualBuilder();
    };
  });
}
function filteredNodeRefs(){
  const query = String(state.nodeRefSearch || '').trim().toLowerCase();
  const nodeFilter = state.nodeRefNodeFilter || '__all';
  return (state.nodeRefCatalog?.refs || []).filter((entry)=>{
    if(nodeFilter !== '__all' && String(entry.node || '') !== nodeFilter) return false;
    if(!query) return true;
    return `${entry.ref} ${entry.label || ''} ${entry.node || ''}`.toLowerCase().includes(query);
  });
}
async function loadNodeRefCatalog(){
  try {
    const data = await api('/api/node-refs?limit=8000');
    state.nodeRefCatalog = { refs: data.refs || [], nodes: data.nodes || [], total: data.total || 0 };
  } catch (error) {
    state.nodeRefCatalog = { refs: [], nodes: [], total: 0 };
  }
}
function renderNodeRefCatalogSection(){
  const refs = filteredNodeRefs();
  const nodes = state.nodeRefCatalog?.nodes || [];
  return `<div class="builder-section catalog-shell"><details class="catalog-panel" ${state.lootUi.refCatalogOpen ? 'open' : ''}><summary class="section-head compact"><div><h4>${escapeHtml(uiText('Node ref catalog', 'Node ref catalog'))}</h4><p class="muted">${escapeHtml(uiText('???????? tree ref ???????????????????????????', 'Use real tree refs instead of typing each one manually.'))}</p></div><div class="actions tight wrap"><span class="tag item">${escapeHtml(`${refs.length}/${state.nodeRefCatalog?.total || 0}`)}</span><button type="button" class="ghost tiny" data-ref-catalog-toggle>${escapeHtml(state.lootUi.refCatalogOpen ? uiText('???? catalog', 'Hide catalog') : uiText('???? catalog', 'Show catalog'))}</button></div></summary><div class="loot-inline-grid catalog-filter-grid"><label><span>${escapeHtml(uiText('????? ref', 'Search refs'))}</span><input id="node-ref-search" value="${escapeHtml(state.nodeRefSearch || '')}" placeholder="${escapeHtml(uiText('????????????????? ref', 'Type a branch name or ref'))}" /></label><label><span>${escapeHtml(uiText('Node file', 'Node file'))}</span><select id="node-ref-node-filter"><option value="__all">${escapeHtml(uiText('???????', 'All nodes'))}</option>${nodes.map((node)=>`<option value="${escapeHtml(node)}"${node === state.nodeRefNodeFilter ? ' selected' : ''}>${escapeHtml(node)}</option>`).join('')}</select></label></div><div class="catalog-result-grid">${refs.slice(0, 120).map((entry)=>`<button type="button" class="result-card catalog-pick-card" data-ref-pick="${escapeHtml(entry.ref)}"><strong>${escapeHtml(entry.label || entry.ref)}</strong><div class="muted">${escapeHtml(`${entry.node} · ${entry.kind}${entry.rarity ? ` · ${entry.rarity}` : ''}`)}</div><code>${escapeHtml(entry.ref)}</code></button>`).join('') || `<div class="muted builder-empty">${escapeHtml(uiText('?????? ref ?????????????????', 'No refs matched this search.'))}</div>`}</div></details></div>`;
}
function bindNodeRefCatalogControls(){
  const toggle = document.querySelector('[data-ref-catalog-toggle]');
  if(toggle) toggle.onclick = ()=>{ state.lootUi.refCatalogOpen = !state.lootUi.refCatalogOpen; renderVisualBuilder(); };
  if($('node-ref-search')) $('node-ref-search').oninput = (event)=>{ state.nodeRefSearch = event.target.value; renderVisualBuilder(); };
  if($('node-ref-node-filter')) $('node-ref-node-filter').onchange = (event)=>{ state.nodeRefNodeFilter = event.target.value; renderVisualBuilder(); };
  document.querySelectorAll('[data-ref-pick]').forEach((button)=>{
    button.onclick = ()=>{
      const ref = button.dataset.refPick || '';
      if(!ref) return;
      const obj = state.currentLootObject || {};
      obj.Nodes = Array.isArray(obj.Nodes) ? obj.Nodes : [];
      const targetIndex = state.focusedLootField?.kind === 'spawner' && Number.isInteger(state.focusedLootField.index) ? state.focusedLootField.index : 0;
      if(!obj.Nodes[targetIndex]) obj.Nodes[targetIndex] = { Rarity: 'Uncommon', Ids: [] };
      obj.Nodes[targetIndex].Ids = Array.isArray(obj.Nodes[targetIndex].Ids) ? obj.Nodes[targetIndex].Ids : [];
      if(!obj.Nodes[targetIndex].Ids.includes(ref)) obj.Nodes[targetIndex].Ids.push(ref);
      renderVisualBuilder();
    };
  });
}

function lootSchemaCoach(summary){
  if(!summary) return {
    title: uiText('ยังไม่รู้โครงไฟล์นี้', 'This file shape is still unknown'),
    description: uiText('เปิดไฟล์ลูทก่อน แล้วตัวช่วยจะอธิบายให้ว่าไฟล์นี้แก้อะไรบ้าง', 'Open a loot file first and the guide will explain what this file controls.'),
    steps: [],
    chips: [],
    legend: []
  };
  if(summary.kind === 'node_tree'){
    return {
      title: uiText('Tree node นี้ควบคุมเส้นทางของลูท', 'This tree node controls how loot branches'),
      description: uiText('เริ่มจากราก แล้วค่อยแตกกิ่งเป็นหมวด ก่อนจบที่ใบซึ่งคือไอเท็มที่ดรอปจริง', 'Start at the root, split into branches, then end on leaves that represent real drops.'),
      steps: [
        uiText('ตั้งชื่อ root ให้บอกโซนหรือธีมของ node นี้', 'Name the root so it clearly describes the zone or theme.'),
        uiText('ใช้ branch เพื่อแบ่งหมวด เช่น Medical, Ammo, Rare', 'Use branches to split categories like Medical, Ammo, or Rare.'),
        uiText('ใช้ leaf เป็นชื่อไอเท็มจริงที่อยากให้สุ่มออก', 'Use leaves for real item class names that can actually drop.')
      ],
      chips: [
        `${summary.leafCount || summary.itemCount || 0} ${uiText('ปลายทางไอเท็ม', 'leaf items')}`,
        `${summary.branchCount || 0} ${uiText('กิ่ง', 'branches')}`,
        `${uiText('ลึกสุด', 'depth')} ${summary.maxDepth || 0}`
      ],
      legend: [
        uiText('Root = จุดเริ่มต้นของ tree นี้', 'Root = starting point of this tree'),
        uiText('Branch = กล่องแบ่งหมวดหรือ rarity', 'Branch = grouping box for categories or rarity'),
        uiText('Leaf = ไอเท็มสุดท้ายที่มีสิทธิ์ถูกสุ่ม', 'Leaf = final item that can be rolled')
      ]
    };
  }
  if(summary.kind === 'spawner'){
    return {
      title: uiText('Spawner preset นี้เป็นตัวเรียก tree refs', 'This spawner preset calls tree refs'),
      description: uiText('ตั้งค่าหลักด้านโอกาสและจำนวนก่อน แล้วค่อยจัดกลุ่ม ref ที่จะให้ spawner นี้หยิบไปใช้', 'Set the core drop rules first, then arrange the groups of refs this spawner should pull from.'),
      steps: [
        uiText('กำหนดโอกาสดรอปและจำนวนที่ spawn ต่อครั้ง', 'Define the drop chance and quantity for each roll.'),
        uiText('เปิดหรือปิดตัวเลือกพิเศษ เช่น duplicate, zone filter, location modifiers', 'Turn special behaviors on or off, such as duplicates, zone filters, and location modifiers.'),
        uiText('แต่ละ Node group คือชุด ref ที่ spawner นี้จะสุ่มเรียก', 'Each node group is a set of refs that this spawner can pull from.')
      ],
      chips: [
        `${summary.groupCount || 0} ${uiText('กลุ่ม ref', 'ref groups')}`,
        `${summary.nodeRefCount || 0} ${uiText('รายการอ้างอิง', 'references')}`,
        `${uiText('จำนวนสุ่ม', 'quantity')} ${summary.quantityMin ?? 0}-${summary.quantityMax ?? 0}`
      ],
      legend: [
        uiText('ค่า root ใช้กับ spawner ทั้งก้อน', 'Root fields apply to the whole spawner'),
        uiText('แต่ละ group มี rarity และ list ของ tree refs', 'Each group has a rarity and a list of tree refs'),
        uiText('คลิกที่ช่อง Tree ids ก่อน แล้วค่อยกดจาก ref catalog จะเร็วสุด', 'Focus a Tree ids field before clicking the ref catalog for the fastest flow')
      ]
    };
  }
  if(summary.kind === 'node'){
    return {
      title: uiText('Flat node นี้คือรายการไอเท็มตรง ๆ', 'This flat node is a direct item list'),
      description: uiText('แต่ละแถวคือไอเท็มหนึ่งตัวพร้อมน้ำหนักหรือ probability ของมัน', 'Each row is one item with its own weight or probability.'),
      steps: [
        uiText('ตั้งชื่อ node ให้รู้ว่าใช้กับบริบทไหน', 'Name the node so its purpose is obvious.'),
        uiText('เพิ่มแถวไอเท็มแล้วใส่ class name จริงของ SCUM', 'Add item rows and enter real SCUM class names.'),
        uiText('ปรับ probability ต่อแถว แล้วใช้ Normalize ถ้าต้องการบาลานซ์รวดเดียว', 'Adjust the probability per row, then use Normalize if you want to rebalance them in one shot.')
      ],
      chips: [
        `${summary.itemCount || 0} ${uiText('รายการไอเท็ม', 'item rows')}`,
        uiText('เหมาะกับ node แบบลิสต์สั้นและตรงไปตรงมา', 'Best for short and direct item lists'),
        uiText('ใช้ catalog ช่วยเติมชื่อไอเท็มได้', 'Use the catalog to fill item names faster')
      ],
      legend: [
        uiText('1 แถว = 1 ไอเท็ม', '1 row = 1 item'),
        uiText('Probability ยิ่งสูง ยิ่งออกบ่อย', 'Higher probability means the item appears more often'),
        uiText('Slider และตัวเลขอัปเดตค่าเดียวกัน', 'The slider and number input control the same value')
      ]
    };
  }
  return {
    title: lootKindLabel(summary.kind),
    description: uiText('ไฟล์นี้มี schema เฉพาะทาง ให้ดูสรุปและ validation คู่กัน', 'This file uses a custom schema, so rely on the summary and validation together.'),
    steps: [],
    chips: [],
    legend: []
  };
}
function treePathLabel(path){
  const parts = parseTreePath(path);
  if(!parts.length) return uiText('ตำแหน่ง: Root', 'Path: Root');
  return `${uiText('ตำแหน่ง', 'Path')}: Root › ${parts.map((part)=>part + 1).join(' › ')}`;
}
function treeRoleText(isRoot, hasChildren){
  if(isRoot) return uiText('นี่คือจุดเริ่มต้นของ tree นี้ ควรสื่อว่ามันแทนโซนหรือหมวดใหญ่ใด', 'This is the starting point of the tree, so it should describe the zone or high-level category.');
  if(hasChildren) return uiText('กิ่งนี้ใช้แบ่งไปยังหมวดย่อยหรือ rarity ระดับถัดไป', 'This branch splits the tree into sub-categories or another rarity layer.');
  return uiText('ปลายทางนี้คือไอเท็มสุดท้ายที่ผู้เล่นมีโอกาสได้รับ', 'This leaf is a final item that the player can actually receive.');
}
function spawnerFieldMeta(key){
  const label = key.replace(/([a-z])([A-Z])/g, '$1 $2');
  const meta = {
    Probability: { label: uiText('โอกาสให้ spawner นี้ทำงาน', 'Spawner chance'), help: uiText('ค่าหลักของ preset นี้ ยิ่งสูงยิ่งมีโอกาสถูกใช้', 'Base chance for this preset. Higher values make the preset fire more often.'), kind: 'number', step: '0.01' },
    QuantityMin: { label: uiText('จำนวนขั้นต่ำ', 'Minimum quantity'), help: uiText('จำนวนต่ำสุดที่จะสุ่มออกในครั้งนี้', 'Lowest quantity this spawner can produce in one roll.'), kind: 'number', step: '1' },
    QuantityMax: { label: uiText('จำนวนสูงสุด', 'Maximum quantity'), help: uiText('จำนวนสูงสุดที่จะสุ่มออกในครั้งนี้', 'Highest quantity this spawner can produce in one roll.'), kind: 'number', step: '1' },
    AllowDuplicates: { label: uiText('อนุญาตให้ซ้ำ', 'Allow duplicates'), help: uiText('เปิดไว้ถ้ารับได้ที่ของชิ้นเดิมจะถูกสุ่มซ้ำในรอบเดียว', 'Turn this on if duplicate results are allowed within the same roll.'), kind: 'boolean' },
    ShouldFilterItemsByZone: { label: uiText('กรองตามโซน', 'Filter by zone'), help: uiText('ให้ระบบคัดเฉพาะรายการที่เหมาะกับโซนหรือพื้นที่นี้', 'Keep only items that are valid for the current zone.'), kind: 'boolean' },
    ShouldApplyLocationSpecificProbabilityModifier: { label: uiText('ใช้ตัวคูณโอกาสตามสถานที่', 'Apply location chance modifier'), help: uiText('ให้ location modifier ของแผนที่มีผลกับโอกาสดรอปของ preset นี้', 'Allow location-specific probability modifiers to affect this preset.'), kind: 'boolean' },
    ShouldApplyLocationSpecificDamageModifier: { label: uiText('ใช้ตัวคูณความเสียหายตามสถานที่', 'Apply location damage modifier'), help: uiText('ให้สภาพของของที่ดรอปเปลี่ยนตาม modifier ของสถานที่นั้น', 'Allow location-specific damage modifiers to affect the spawned condition.'), kind: 'boolean' },
    InitialDamage: { label: uiText('ความเสียหายเริ่มต้น', 'Base damage'), help: uiText('ความเสียหายตั้งต้นของไอเท็มที่เกิดออกมา', 'Starting damage applied to spawned items.'), kind: 'number', step: '0.01' },
    RandomDamage: { label: uiText('สุ่มความเสียหายเพิ่ม', 'Random damage'), help: uiText('ช่วงสุ่มเพิ่มจากค่าความเสียหายตั้งต้น', 'Extra random damage layered on top of the base damage.'), kind: 'number', step: '0.01' },
    InitialUsage: { label: uiText('ค่าใช้งานเริ่มต้น', 'Base usage'), help: uiText('ค่า usage ตั้งต้นของไอเท็ม เช่น durability หรือ usage ที่เกี่ยวข้อง', 'Base usage applied to spawned items, such as durability-like values.'), kind: 'number', step: '0.01' },
    RandomUsage: { label: uiText('สุ่มค่าใช้งานเพิ่ม', 'Random usage'), help: uiText('ช่วงสุ่มเพิ่มจากค่า usage เริ่มต้น', 'Extra random usage added on top of the base usage.'), kind: 'number', step: '0.01' }
  };
  return meta[key] || {
    label,
    help: uiText('ฟิลด์ขั้นสูง เก็บไว้ให้ schema นี้ใช้ตามไฟล์จริง', 'Advanced field preserved for this schema exactly as found in the real file.'),
    kind: typeof state.currentLootObject?.[key] === 'boolean' || /^Should|^Allow/.test(key) ? 'boolean' : (/Probability|Quantity|Damage|Usage|Chance|Weight|Min|Max/i.test(key) ? 'number' : 'text'),
    step: 'any'
  };
}
function buildSpawnerFieldControl(obj, key){
  const meta = spawnerFieldMeta(key);
  const rawValue = obj[key];
  if(meta.kind === 'boolean'){
    const boolValue = rawValue === true || String(rawValue).toLowerCase() === 'true';
    return `<label><span>${escapeHtml(meta.label)}</span><select data-spawner-field="${key}" data-field-kind="boolean">${buildBooleanOptions(boolValue)}</select><small class="field-help">${escapeHtml(meta.help)}</small></label>`;
  }
  const value = rawValue ?? '';
  const inputType = meta.kind === 'number' ? 'number' : 'text';
  const step = meta.kind === 'number' ? `step="${escapeHtml(meta.step || 'any')}"` : '';
  return `<label><span>${escapeHtml(meta.label)}</span><input data-spawner-field="${key}" data-field-kind="${meta.kind}" type="${inputType}" ${step} value="${escapeHtml(value)}" /><small class="field-help">${escapeHtml(meta.help)}</small></label>`;
}
function groupedSpawnerFields(fieldKeys){
  const groups = [
    { title: uiText('Step 1 · โอกาสและจำนวนดรอป', 'Step 1 · Drop chance and quantity'), hint: uiText('ตั้งค่าหลักของ spawner ก่อน เพราะมันกำหนดว่ากลุ่ม ref จะถูกสุ่มบ่อยแค่ไหน', 'Set the core spawn behavior first. It controls how often the ref groups can roll.'), keys: ['Probability', 'QuantityMin', 'QuantityMax', 'AllowDuplicates'] },
    { title: uiText('Step 2 · ตัวกรองและตัวคูณตามพื้นที่', 'Step 2 · Filters and location modifiers'), hint: uiText('ใช้กลุ่มนี้เมื่ออยากให้พฤติกรรมของลูทเปลี่ยนไปตามโซนหรือสถานที่', 'Use these switches when the loot behavior should depend on zones or location modifiers.'), keys: ['ShouldFilterItemsByZone', 'ShouldApplyLocationSpecificProbabilityModifier', 'ShouldApplyLocationSpecificDamageModifier'] },
    { title: uiText('Step 3 · สภาพของไอเท็ม', 'Step 3 · Item condition'), hint: uiText('กำหนดความเสียหายและค่าใช้งานของของที่เกิดออกมา', 'Tune the damage and usage values of the spawned items.'), keys: ['InitialDamage', 'RandomDamage', 'InitialUsage', 'RandomUsage'] }
  ];
  const assigned = new Set();
  const prepared = groups.map((group)=>{ const keys = group.keys.filter((key)=>fieldKeys.includes(key)); keys.forEach((key)=>assigned.add(key)); return { ...group, keys }; }).filter((group)=>group.keys.length);
  const leftovers = fieldKeys.filter((key)=>!assigned.has(key));
  if(leftovers.length) prepared.push({ title: uiText('Advanced fields', 'Advanced fields'), hint: uiText('ช่องที่ schema นี้มีเพิ่มจากกลุ่มหลัก ยังเก็บไว้ให้แก้ได้ตรง ๆ', 'Extra fields found in this schema remain editable here.'), keys: leftovers });
  return prepared;
}

function renderLootDependencyPanel(analysis){
  if(!analysis) return `<div class="muted">${escapeHtml(uiText('ยังไม่มีข้อมูลความสัมพันธ์', 'No dependency data yet.'))}</div>`;
  if(analysis.summary?.kind === 'spawner'){
    const refs = collectSpawnerRefs(analysis.object);
    return `<div class="loot-summary-shell"><div class="builder-legend-card"><h4>${escapeHtml(uiText('Spawner นี้เรียก tree refs ไหนบ้าง', 'Which tree refs this spawner uses'))}</h4><p class="muted">${escapeHtml(uiText('ทุก ref ด้านล่างคือปลายทางที่ spawner นี้มีสิทธิ์หยิบไปสุ่มต่อ', 'Each ref below is a destination that this spawner can pull from.'))}</p></div>${refs.length ? `<div class="visual-table">${refs.slice(0, 48).map((ref)=>`<div class="result-card"><strong>${escapeHtml(ref)}</strong><div class="muted">${escapeHtml(uiText('Tree ref ที่ถูกอ้างโดย preset นี้', 'Tree ref referenced by this preset'))}</div></div>`).join('')}</div>` : `<div class="muted">${escapeHtml(uiText('spawner นี้ยังไม่มี ref', 'This spawner does not reference anything yet.'))}</div>`}</div>`;
  }
  const usedBy = analysis.dependencies?.usedBy || [];
  return `<div class="loot-summary-shell"><div class="builder-legend-card"><h4>${escapeHtml(uiText('ไฟล์นี้ถูกใช้งานจากตรงไหน', 'Where this file is used'))}</h4><p class="muted">${escapeHtml(uiText('แต่ละรายการด้านล่างคือ spawner ที่อ้างถึง node นี้อยู่ตอนนี้', 'Each row below is a spawner that currently points to this node.'))}</p></div>${usedBy.length ? `<div class="visual-table">${usedBy.map((entry)=>`<div class="result-card"><strong>${escapeHtml(entry.spawner)}</strong><div class="muted">${escapeHtml(entry.path)}</div>${entry.ref ? `<div class="muted">${escapeHtml(entry.ref)}</div>` : ''}</div>`).join('')}</div>` : `<div class="muted">${escapeHtml(uiText('ยังไม่มี spawner ไหนอ้างไฟล์นี้', 'No spawner references this file yet.'))}</div>`}</div>`;
}

function lootUiLabel(key){
  if(key === 'compact') return state.lootUi.compact ? uiText('โหมดสบายตา', 'Comfort view') : uiText('โหมดกระชับ', 'Compact mode');
  if(key === 'guides') return state.lootUi.showGuides ? uiText('ซ่อนคำอธิบาย', 'Hide notes') : uiText('เปิดคำอธิบาย', 'Show notes');
  return '';
}
function bindLootUiControls(){
  const compactBtn = $('loot-ui-compact');
  if(compactBtn) compactBtn.onclick = ()=>{ state.lootUi.compact = !state.lootUi.compact; renderVisualBuilder(); };
  const guideBtn = $('loot-ui-guides');
  if(guideBtn) guideBtn.onclick = ()=>{ state.lootUi.showGuides = !state.lootUi.showGuides; renderVisualBuilder(); };
  document.querySelectorAll('[data-tree-focus]').forEach((button)=>button.onclick=()=>{ state.lootUi.treeFocusPath = button.dataset.treeFocus || 'root'; renderVisualBuilder(); });
}
function renderBuilderCoach(summary){
  const coach = lootSchemaCoach(summary);
  return `<div class="builder-guide-shell"><div class="section-head compact"><div><h4>${escapeHtml(coach.title)}</h4><p class="muted">${escapeHtml(coach.description)}</p></div><div class="actions tight wrap"><button id="loot-ui-guides" class="ghost tiny">${escapeHtml(lootUiLabel('guides'))}</button><button id="loot-ui-compact" class="ghost tiny">${escapeHtml(lootUiLabel('compact'))}</button></div></div><div class="guide-chip-list">${coach.chips.map((chip)=>`<span class="guide-chip">${escapeHtml(chip)}</span>`).join('')}</div>${state.lootUi.showGuides ? `<div class="builder-guide-grid"><div class="builder-guide-card"><h4>${escapeHtml(uiText('ลำดับที่ควรแก้', 'Recommended order'))}</h4><ol class="guide-step-list">${coach.steps.map((step)=>`<li>${escapeHtml(step)}</li>`).join('')}</ol></div><div class="builder-legend-card"><h4>${escapeHtml(uiText('อ่านความหมายของหน้าเร็ว ๆ', 'How to read this screen'))}</h4><ul class="guide-step-list">${coach.legend.map((item)=>`<li>${escapeHtml(item)}</li>`).join('')}</ul></div></div>` : ''}</div>`;
}
function countTreeLeafNodes(node){
  const children = Array.isArray(node?.Children) ? node.Children : [];
  if(!children.length) return 1;
  return children.reduce((sum, child)=>sum + countTreeLeafNodes(child), 0);
}
function renderTreeFocusStrip(root){
  const children = Array.isArray(root?.Children) ? root.Children : [];
  if(!children.length) return '';
  return `<div class="tree-focus-strip"><button class="tree-focus-chip ${state.lootUi.treeFocusPath === 'root' ? 'active' : ''}" data-tree-focus="root"><strong>${escapeHtml(uiText('ทั้ง tree', 'Whole tree'))}</strong><span>${escapeHtml(uiText('ภาพรวมทั้งหมด', 'Full overview'))}</span></button>${children.map((child, index)=>`<button class="tree-focus-chip ${state.lootUi.treeFocusPath === String(index) ? 'active' : ''}" data-tree-focus="${index}"><strong>${escapeHtml(child?.Name || `${uiText('กิ่ง', 'Branch')} ${index + 1}`)}</strong><span>${escapeHtml(`${Array.isArray(child?.Children) ? child.Children.length : 0} ${uiText('กิ่งย่อย', 'sub-branches')} · ${countTreeLeafNodes(child)} ${uiText('ไอเท็ม', 'items')}`)}</span></button>`).join('')}</div>`;
}

function renderLootSummaryPanel(summaryInput){
  const summary = summaryInput || state.currentLootAnalysis?.summary || null;
  if(!summary) return `<div class="muted">${escapeHtml(uiText('ยังไม่มีข้อมูลสรุป', 'No summary available.'))}</div>`;
  const counts = state.currentLootAnalysis?.validation?.counts || { critical: 0, warning: 0, info: 0 };
  const rows = [
    { label: uiText('Schema', 'Schema'), value: lootKindLabel(summary.kind) },
    { label: uiText('ชื่อ', 'Name'), value: summary.name || uiText('ไม่มีชื่อ', '(unnamed)') }
  ];
  if(summary.kind === 'node_tree') rows.push({ label: uiText('ไอเท็มปลายทาง', 'Leaf items'), value: summary.leafCount ?? summary.itemCount ?? 0 }, { label: uiText('กิ่ง', 'Branches'), value: summary.branchCount ?? 0 }, { label: uiText('ลึกสุด', 'Max depth'), value: summary.maxDepth ?? 0 });
  else if(summary.kind === 'spawner') rows.push({ label: uiText('กลุ่ม ref', 'Ref groups'), value: summary.groupCount ?? 0 }, { label: uiText('จำนวน ref', 'References'), value: summary.nodeRefCount ?? 0 }, { label: uiText('ช่วงจำนวน', 'Quantity range'), value: `${summary.quantityMin ?? 0}-${summary.quantityMax ?? 0}` });
  else rows.push({ label: uiText('จำนวนแถว', 'Rows'), value: summary.itemCount ?? 0 });
  return `<div class="loot-summary-shell"><div class="mini-stat-grid">${rows.map((row)=>`<div class="mini-stat"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`).join('')}</div><div class="guide-chip-list"><span class="guide-chip critical">${escapeHtml(`${counts.critical || 0} ${uiText('critical', 'critical')}`)}</span><span class="guide-chip warning">${escapeHtml(`${counts.warning || 0} ${uiText('warning', 'warning')}`)}</span><span class="guide-chip info">${escapeHtml(`${counts.info || 0} ${uiText('info', 'info')}`)}</span></div></div>`;
}
function renderFlatNodeBuilder(obj){
  const list = Array.isArray(obj.Items) ? obj.Items : (obj.Items = []);
  const summary = state.currentLootAnalysis?.summary || { kind: 'node', itemCount: list.length, name: obj.Name || '' };
  const getProb = (entry)=> Number(entry.Probability ?? entry.Chance ?? 1);
  const setProb = (entry, value)=>{ if('Chance' in entry && !('Probability' in entry)) entry.Chance = value; else entry.Probability = value; };
  const totalProbability = Number(list.reduce((sum, entry)=>sum + Math.max(0, getProb(entry) || 0), 0).toFixed(4));
  const rows = list.map((entry, index)=>{ const probability = Number(getProb(entry).toFixed(4)); const open = index === 0 || state.focusedLootField?.kind === 'flat' && state.focusedLootField.index === index; return `<details class="builder-row-card loot-row-card" ${open ? 'open' : ''}><summary class="row-head row-summary"><strong>${escapeHtml(uiText(`แถวไอเท็ม ${index + 1}`, `Item row ${index + 1}`))}</strong><div class="row-meta"><span class="tag item">${escapeHtml(entry.ClassName || entry.Item || entry.Name || uiText('ยังไม่ตั้งชื่อ', 'Unnamed'))}</span><span class="tag">${escapeHtml(`${uiText('ค่า', 'value')} ${probability}`)}</span></div></summary><div class="loot-inline-grid"><label><span>${escapeHtml(uiText('Class name', 'Class name'))}</span><input data-entry-name="${index}" list="loot-item-options" value="${escapeHtml(entry.ClassName || entry.Item || entry.Name || '')}" placeholder="Weapon_AK47" />${state.lootUi.compact ? '' : `<small class="field-help">${escapeHtml(uiText('ใช้ Item catalog ด้านล่างช่วยเติมชื่อได้', 'Use the item catalog below to fill names faster.'))}</small>`}</label><label><span>${escapeHtml(uiText('น้ำหนัก / Probability', 'Weight / Probability'))}</span><input data-entry-prob="${index}" value="${probability}" type="number" step="0.01" min="0" max="1" />${state.lootUi.compact ? '' : `<small class="field-help">${escapeHtml(uiText('ค่าสูงออกบ่อยกว่า', 'Higher values appear more often.'))}</small>`}</label><label><span>${escapeHtml(uiText('ปรับเร็ว', 'Quick slider'))}</span><input data-entry-range="${index}" value="${probability}" type="range" step="0.01" min="0" max="1" /></label></div><div class="actions tight wrap"><button data-dup-row="${index}" class="ghost tiny">${escapeHtml(t('duplicate'))}</button><button data-up-row="${index}" class="ghost tiny">${escapeHtml(t('moveUp'))}</button><button data-down-row="${index}" class="ghost tiny">${escapeHtml(t('moveDown'))}</button><button data-remove-row="${index}" class="danger-outline tiny">${escapeHtml(uiText('ลบแถว', 'Remove row'))}</button></div></details>`; }).join('');
  $('visual-builder').innerHTML=`<div class="loot-builder-shell ${state.lootUi.compact ? 'compact' : ''}">${renderBuilderCoach(summary)}<div class="builder-section"><div class="section-head compact"><div><h4>${escapeHtml(uiText('Node info', 'Node info'))}</h4><p class="muted">${escapeHtml(uiText('ตั้งบริบทของ node ก่อน แล้วค่อยแก้ไอเท็มด้านล่าง', 'Set the node context first, then tune the item rows below.'))}</p></div><div class="actions tight wrap"><span class="tag node">${escapeHtml(lootKindLabel('node'))}</span><button id="sync-visual-to-raw" class="tiny">${escapeHtml(uiText('อัปเดต JSON ดิบ', 'Update Raw JSON'))}</button></div></div><div class="loot-inline-grid"><label><span>${escapeHtml(uiText('ชื่อโหนด', 'Node name'))}</span><input id="visual-name" value="${escapeHtml(obj.Name || '')}" /></label><label><span>${escapeHtml(uiText('โน้ต', 'Notes'))}</span><input id="visual-notes" value="${escapeHtml(obj.Notes || '')}" /></label></div></div><div class="builder-section"><div class="section-head compact"><div><h4>${escapeHtml(uiText('รายการไอเท็ม', 'Item rows'))}</h4><p class="muted">${escapeHtml(uiText('แต่ละแถวคือ 1 ไอเท็ม กางเฉพาะแถวที่กำลังแก้ก็พอ', 'Each row is one item. Open only the row you are working on.'))}</p></div><div class="actions tight wrap"><button id="add-visual-row" class="ghost tiny">${escapeHtml(uiText('เพิ่มไอเท็ม', 'Add item'))}</button><button id="normalize-visual" class="ghost tiny">${escapeHtml(t('normalize'))}</button><button id="quick-add-ak" class="ghost tiny">${escapeHtml(uiText('ใส่ชุด AK เร็ว ๆ', 'Quick AK pack'))}</button></div></div><div class="mini-stat-grid"><div class="mini-stat"><span>${escapeHtml(uiText('จำนวนแถว', 'Rows'))}</span><strong>${escapeHtml(list.length)}</strong></div><div class="mini-stat"><span>${escapeHtml(uiText('ผลรวม probability', 'Total probability'))}</span><strong>${escapeHtml(totalProbability)}</strong></div><div class="mini-stat"><span>${escapeHtml(uiText('โหมด', 'Mode'))}</span><strong>${escapeHtml(state.lootUi.compact ? uiText('กระชับ', 'Compact') : uiText('ปกติ', 'Standard'))}</strong></div></div><div class="visual-table">${rows || `<div class="muted builder-empty">${escapeHtml(uiText('ยังไม่มีรายการไอเท็ม', 'No item rows yet.'))}</div>`}</div></div>${renderItemCatalogSection('flat')}</div>`;
  $('visual-name').oninput=(e)=>obj.Name=e.target.value;
  $('visual-notes').oninput=(e)=>obj.Notes=e.target.value;
  $('sync-visual-to-raw').onclick=syncVisualBuilderToRaw;
  $('add-visual-row').onclick=()=>{ obj.Items.push({ ClassName:'', Probability:1 }); renderVisualBuilder(); };
  $('normalize-visual').onclick=()=>{ const total=list.reduce((sum, entry)=>sum + Math.max(0, getProb(entry) || 0), 0); if(!total) return showToast(uiText('ยังไม่มี probability ให้ normalize', 'Nothing to normalize.'), true); list.forEach((entry)=>setProb(entry, Number(((Math.max(0, getProb(entry) || 0)) / total).toFixed(4)))); renderVisualBuilder(); showToast(t('normalize')); };
  $('quick-add-ak').onclick=()=>{ obj.Items.push({ ClassName:'Weapon_AK47', Probability:0.4 },{ ClassName:'AK47_Magazine', Probability:0.3 },{ ClassName:'Ammo_762x39', Probability:0.3 }); renderVisualBuilder(); };
  document.querySelectorAll('[data-entry-name]').forEach((el)=>{ el.onfocus=()=>{ state.focusedLootField = { kind:'flat', index:Number(el.dataset.entryName) }; }; el.oninput=(e)=>{ const idx=Number(e.target.dataset.entryName); obj.Items[idx].ClassName=e.target.value; }; });
  document.querySelectorAll('[data-entry-prob]').forEach((el)=>el.oninput=(e)=>{ const idx=Number(e.target.dataset.entryProb); const value=Math.max(0, Math.min(1, Number(e.target.value || 0))); setProb(list[idx], value); const range=document.querySelector(`[data-entry-range="${idx}"]`); if(range) range.value=String(value); });
  document.querySelectorAll('[data-entry-range]').forEach((el)=>el.oninput=(e)=>{ const idx=Number(e.target.dataset.entryRange); const value=Number(e.target.value || 0); setProb(list[idx], value); const numberInput=document.querySelector(`[data-entry-prob="${idx}"]`); if(numberInput) numberInput.value=String(value); });
  document.querySelectorAll('[data-remove-row]').forEach((el)=>el.onclick=(e)=>{ list.splice(Number(e.target.dataset.removeRow), 1); renderVisualBuilder(); });
  document.querySelectorAll('[data-dup-row]').forEach((el)=>el.onclick=(e)=>{ const idx=Number(e.target.dataset.dupRow); list.splice(idx + 1, 0, JSON.parse(JSON.stringify(list[idx]))); renderVisualBuilder(); });
  document.querySelectorAll('[data-up-row]').forEach((el)=>el.onclick=(e)=>{ const idx=Number(e.target.dataset.upRow); if(idx<=0) return; [list[idx-1], list[idx]] = [list[idx], list[idx-1]]; renderVisualBuilder(); });
  document.querySelectorAll('[data-down-row]').forEach((el)=>el.onclick=(e)=>{ const idx=Number(e.target.dataset.downRow); if(idx>=list.length-1) return; [list[idx+1], list[idx]] = [list[idx], list[idx+1]]; renderVisualBuilder(); });
  bindItemCatalogControls('flat');
  bindLootUiControls();
  updateLootWorkspaceLayout();
  updateLootWorkspaceCopy();
  refreshLootDirtyState();
}

function renderTreeNodeCard(node, path='root', depth=0){
  const term = (state.treeSearch || '').trim().toLowerCase();
  const isRoot = path === 'root';
  if(!node || typeof node !== 'object' || Array.isArray(node)){
    return `<div class="tree-node-card invalid"><div class="tree-node-body"><div class="tree-node-caption">${escapeHtml(uiText('พบ child ที่โครงไม่ถูกต้อง ลบออกได้จากตรงนี้', 'This child is invalid. Remove it here.'))}</div><div class="actions tight wrap tree-toolbar">${!isRoot ? `<button data-tree-remove="${path}" class="danger-outline tiny">${escapeHtml(uiText('ลบโหนด', 'Remove node'))}</button>` : ''}</div></div></div>`;
  }
  if(!isRoot && term && !treeNodeMatchesSearch(node, term)) return '';
  const children = Array.isArray(node.Children) ? node.Children : [];
  const visibleChildren = children.map((child, index)=>({ child, index })).filter((entry)=>!term || treeNodeMatchesSearch(entry.child, term));
  const hasChildren = children.length > 0;
  const role = isRoot ? uiText('Root', 'Root') : hasChildren ? uiText('Branch', 'Branch') : uiText('Leaf', 'Leaf');
  const open = term ? true : isRoot || (!state.lootUi.compact && depth < 1);
  return `<details class="tree-node-card ${hasChildren ? 'branch' : 'leaf'}" ${open ? 'open' : ''}><summary class="tree-node-summary"><div>${state.lootUi.compact ? '' : `<div class="tree-pathline">${escapeHtml(treePathLabel(path))}</div>`}<div class="tree-node-heading"><span class="tag ${hasChildren ? 'node' : 'item'}">${escapeHtml(role)}</span><strong>${escapeHtml(node.Name || uiText('ยังไม่มีชื่อ', 'Unnamed'))}</strong></div></div><div class="tree-node-meta"><span>${escapeHtml(node.Rarity || uiText('ไม่ตั้งค่า', 'Unset'))}</span><span>${escapeHtml(hasChildren ? `${visibleChildren.length}/${children.length} ${uiText('ลูก', 'children')}` : uiText('ปลายทางไอเท็ม', 'item leaf'))}</span></div></summary><div class="tree-node-body">${state.lootUi.compact ? '' : `<div class="tree-role-note">${escapeHtml(treeRoleText(isRoot, hasChildren))}</div>`}<div class="loot-inline-grid tree-fields"><label><span>${escapeHtml(uiText('ชื่อโหนด', 'Node name'))}</span><input data-tree-name="${path}" data-tree-role="${hasChildren ? 'branch' : 'leaf'}" ${hasChildren ? '' : 'list="loot-item-options"'} value="${escapeHtml(node.Name || '')}" /></label><label><span>${escapeHtml(uiText('Rarity', 'Rarity'))}</span><select data-tree-rarity="${path}">${buildRarityOptions(node.Rarity || '')}</select></label></div><div class="actions tight wrap tree-toolbar"><button data-tree-add="${path}" class="ghost tiny">${escapeHtml(uiText('เพิ่มลูก', 'Add child'))}</button>${!isRoot ? `<button data-tree-dup="${path}" class="ghost tiny">${escapeHtml(t('duplicate'))}</button><button data-tree-up="${path}" class="ghost tiny">${escapeHtml(t('moveUp'))}</button><button data-tree-down="${path}" class="ghost tiny">${escapeHtml(t('moveDown'))}</button><button data-tree-remove="${path}" class="danger-outline tiny">${escapeHtml(uiText('ลบโหนด', 'Remove node'))}</button>` : ''}</div>${visibleChildren.length ? `<div class="tree-children">${visibleChildren.map((entry)=>renderTreeNodeCard(entry.child, path === 'root' ? String(entry.index) : `${path}.${entry.index}`, depth + 1)).join('')}</div>` : hasChildren ? `<div class="muted builder-empty">${escapeHtml(uiText('ไม่มี child ที่ตรงกับคำค้นนี้', 'No child matched this search.'))}</div>` : ''}</div></details>`;
}
function renderTreeNodeBuilder(obj){
  if(!Array.isArray(obj.Children)) obj.Children = [];
  const summary = state.currentLootAnalysis?.summary || { kind: 'node_tree', name: obj.Name || '', leafCount: 0, branchCount: 0, maxDepth: 0 };
  const focusPath = state.lootUi.treeFocusPath || 'root';
  const focusedNode = focusPath === 'root' ? obj : (getTreeNodeAtPath(obj, focusPath) || obj);
  const treeMatches = countVisibleTreeNodes(focusedNode, state.treeSearch);
  const treeMarkup = state.treeSearch && !treeNodeMatchesSearch(focusedNode, state.treeSearch) ? `<div class="muted builder-empty">${escapeHtml(uiText('ไม่เจอ node หรือ item ที่ตรงกับคำค้นนี้', 'No node or item matched this search.'))}</div>` : renderTreeNodeCard(focusedNode, focusPath, 0);
  $('visual-builder').innerHTML=`<div class="loot-builder-shell ${state.lootUi.compact ? 'compact' : ''}">${renderBuilderCoach(summary)}<div class="builder-section"><div class="section-head compact"><div><h4>${escapeHtml(uiText('Tree focus', 'Tree focus'))}</h4><p class="muted">${escapeHtml(uiText('เลือกกิ่งที่อยากแก้ก่อน จะช่วยให้ไฟล์ใหญ่ไม่ยาวรกทั้งหน้า', 'Choose the branch you want to edit first so large trees stay manageable.'))}</p></div><div class="actions tight wrap"><span class="tag item">${escapeHtml(`${treeMatches} ${uiText('จุดที่เห็น', 'visible nodes')}`)}</span>${focusPath !== 'root' ? `<button class="ghost tiny" data-tree-focus="root">${escapeHtml(uiText('กลับไปดูทั้ง tree', 'Back to whole tree'))}</button>` : ''}</div></div>${renderTreeFocusStrip(obj)}<div class="loot-inline-grid catalog-filter-grid"><label><span>${escapeHtml(uiText('ค้นหาใน tree', 'Search this tree'))}</span><input id="tree-search-input" value="${escapeHtml(state.treeSearch || '')}" placeholder="${escapeHtml(uiText('เช่น Medical, Ammo, Rare', 'For example Medical, Ammo, Rare'))}" /></label><label><span>${escapeHtml(uiText('ชื่อรากของ tree', 'Tree root name'))}</span><input id="tree-root-name" value="${escapeHtml(obj.Name || '')}" /></label><label><span>${escapeHtml(uiText('Rarity ของราก', 'Root rarity'))}</span><select id="tree-root-rarity">${buildRarityOptions(obj.Rarity || '')}</select></label></div><div class="tree-root-wrap">${treeMarkup}</div><div class="actions tight wrap"><button id="tree-add-root-child" class="ghost tiny">${escapeHtml(uiText('เพิ่ม child ที่ root', 'Add child to root'))}</button><button id="sync-visual-to-raw" class="tiny">${escapeHtml(uiText('อัปเดต JSON ดิบ', 'Update Raw JSON'))}</button></div></div>${renderItemCatalogSection('tree')}</div>`;
  $('sync-visual-to-raw').onclick=syncVisualBuilderToRaw;
  $('tree-root-name').oninput=(e)=>obj.Name=e.target.value;
  $('tree-root-rarity').onchange=(e)=>obj.Rarity=e.target.value;
  $('tree-search-input').oninput=(e)=>{ state.treeSearch = e.target.value; renderVisualBuilder(); };
  $('tree-add-root-child').onclick=()=>{ obj.Children.push({ Name: uiText('รายการใหม่', 'New entry'), Rarity: obj.Rarity || 'Uncommon' }); renderVisualBuilder(); };
  document.querySelectorAll('[data-tree-name]').forEach((el)=>{ el.onfocus=()=>{ state.focusedLootField = { kind:'tree', path: el.dataset.treeName, role: el.dataset.treeRole || 'leaf' }; }; el.oninput=(e)=>{ const node=getTreeNodeAtPath(obj, e.target.dataset.treeName); if(node) node.Name=e.target.value; }; });
  document.querySelectorAll('[data-tree-rarity]').forEach((el)=>el.onchange=(e)=>{ const node=getTreeNodeAtPath(obj, e.target.dataset.treeRarity); if(node) node.Rarity=e.target.value; });
  document.querySelectorAll('[data-tree-add]').forEach((el)=>el.onclick=(e)=>{ const node=getTreeNodeAtPath(obj, e.target.dataset.treeAdd); if(!node) return; node.Children = Array.isArray(node.Children) ? node.Children : []; node.Children.push({ Name: uiText('รายการใหม่', 'New entry'), Rarity: node.Rarity || 'Uncommon' }); renderVisualBuilder(); });
  document.querySelectorAll('[data-tree-remove]').forEach((el)=>el.onclick=(e)=>{ const info=getTreeParentInfo(obj, e.target.dataset.treeRemove); if(!info) return; info.collection.splice(info.index, 1); renderVisualBuilder(); });
  document.querySelectorAll('[data-tree-dup]').forEach((el)=>el.onclick=(e)=>{ const info=getTreeParentInfo(obj, e.target.dataset.treeDup); if(!info) return; info.collection.splice(info.index + 1, 0, JSON.parse(JSON.stringify(info.collection[info.index]))); renderVisualBuilder(); });
  document.querySelectorAll('[data-tree-up]').forEach((el)=>el.onclick=(e)=>{ const info=getTreeParentInfo(obj, e.target.dataset.treeUp); if(!info || info.index<=0) return; [info.collection[info.index - 1], info.collection[info.index]] = [info.collection[info.index], info.collection[info.index - 1]]; renderVisualBuilder(); });
  document.querySelectorAll('[data-tree-down]').forEach((el)=>el.onclick=(e)=>{ const info=getTreeParentInfo(obj, e.target.dataset.treeDown); if(!info || info.index>=info.collection.length - 1) return; [info.collection[info.index + 1], info.collection[info.index]] = [info.collection[info.index], info.collection[info.index + 1]]; renderVisualBuilder(); });
  bindItemCatalogControls('tree');
  bindLootUiControls();
  updateLootWorkspaceLayout();
  updateLootWorkspaceCopy();
  refreshLootDirtyState();
}
function renderSpawnerBuilder(obj){
  if(!Array.isArray(obj.Nodes)) obj.Nodes = [];
  const summary = state.currentLootAnalysis?.summary || { kind: 'spawner', groupCount: obj.Nodes.length, nodeRefCount: collectSpawnerRefs(obj).length, quantityMin: obj.QuantityMin ?? 0, quantityMax: obj.QuantityMax ?? 0 };
  const preferredFields = ['Probability','QuantityMin','QuantityMax','AllowDuplicates','ShouldFilterItemsByZone','ShouldApplyLocationSpecificProbabilityModifier','ShouldApplyLocationSpecificDamageModifier','InitialDamage','RandomDamage','InitialUsage','RandomUsage'];
  const extraFields = Object.keys(obj).filter((key)=>!['Nodes','Items','Children','Name','Notes'].includes(key) && !preferredFields.includes(key)).sort();
  const fieldKeys = Array.from(new Set([...preferredFields, ...extraFields]));
  const fieldSections = groupedSpawnerFields(fieldKeys).map((group, index)=>`<details class="field-group-card" ${index === 0 ? 'open' : ''}><summary class="row-head row-summary"><strong>${escapeHtml(group.title)}</strong></summary><p class="muted">${escapeHtml(group.hint)}</p><div class="field-group-grid">${group.keys.map((key)=>buildSpawnerFieldControl(obj, key)).join('')}</div></details>`).join('');
  const groups = obj.Nodes.map((entry, index)=>{ const ids = Array.isArray(entry.Ids) ? entry.Ids : [entry.Node || entry.Name || entry.Ref].filter(Boolean); const open = index === 0 || state.focusedLootField?.kind === 'spawner' && state.focusedLootField.index === index; return `<details class="builder-row-card spawner-entry" ${open ? 'open' : ''}><summary class="spawner-group-header"><div><strong>${escapeHtml(uiText(`Group ${index + 1}`, `Group ${index + 1}`))}</strong><div class="muted">${escapeHtml(`${ids.length} ${uiText('refs', 'refs')}`)}</div></div><span class="tag">${escapeHtml(entry.Rarity || uiText('ไม่ตั้งค่า', 'Unset'))}</span></summary><div class="loot-inline-grid spawner-entry-grid"><label><span>${escapeHtml(uiText('Group rarity', 'Group rarity'))}</span><select data-group-rarity="${index}">${buildRarityOptions(entry.Rarity || '')}</select></label><label class="span-two"><span>${escapeHtml(uiText('Tree ids', 'Tree ids'))}</span><textarea data-group-ids="${index}" class="ids-editor" placeholder="${escapeHtml(uiText('หนึ่ง ref ต่อหนึ่งบรรทัด', 'One ref per line'))}">${escapeHtml(ids.join('\n'))}</textarea>${state.lootUi.compact ? '' : `<small class="field-help">${escapeHtml(uiText('คลิกในช่องนี้ก่อน แล้วใช้ Node ref catalog ด้านล่างช่วยเติม', 'Focus here first, then use the Node ref catalog below to append refs quickly.'))}</small>`}</label></div><div class="actions tight wrap"><button data-group-dup="${index}" class="ghost tiny">${escapeHtml(t('duplicate'))}</button><button data-group-up="${index}" class="ghost tiny">${escapeHtml(t('moveUp'))}</button><button data-group-down="${index}" class="ghost tiny">${escapeHtml(t('moveDown'))}</button><button data-group-remove="${index}" class="danger-outline tiny">${escapeHtml(uiText('ลบกลุ่ม', 'Remove group'))}</button></div></details>`; }).join('');
  $('visual-builder').innerHTML=`<div class="loot-builder-shell ${state.lootUi.compact ? 'compact' : ''}">${renderBuilderCoach(summary)}<div class="builder-section"><div class="section-head compact"><div><h4>${escapeHtml(uiText('Spawner settings', 'Spawner settings'))}</h4><p class="muted">${escapeHtml(uiText('กางเฉพาะกลุ่ม field ที่กำลังแก้ จะช่วยให้ preset ยาว ๆ อ่านง่ายขึ้น', 'Open only the field groups you are editing so long presets stay readable.'))}</p></div><div class="actions tight wrap"><span class="tag spawner">${escapeHtml(lootKindLabel('spawner'))}</span><button id="sync-visual-to-raw" class="tiny">${escapeHtml(uiText('อัปเดต JSON ดิบ', 'Update Raw JSON'))}</button></div></div><div class="spawner-field-groups">${fieldSections}</div></div><div class="builder-section"><div class="section-head compact"><div><h4>${escapeHtml(uiText('Node groups', 'Node groups'))}</h4><p class="muted">${escapeHtml(uiText('แต่ละกลุ่มคือชุด ref ที่ spawner นี้สุ่มใช้ เปิดทีละกลุ่มจะอ่านง่ายกว่า', 'Each group is a set of refs this spawner can use. Opening one group at a time keeps the page cleaner.'))}</p></div><div class="actions tight wrap"><button id="spawner-add-group" class="ghost tiny">${escapeHtml(uiText('เพิ่มกลุ่ม', 'Add group'))}</button></div></div><div class="visual-table">${groups || `<div class="muted builder-empty">${escapeHtml(uiText('ยังไม่มี node group', 'No node groups yet.'))}</div>`}</div></div>${renderNodeRefCatalogSection()}</div>`;
  $('sync-visual-to-raw').onclick=syncVisualBuilderToRaw;
  $('spawner-add-group').onclick=()=>{ obj.Nodes.push({ Rarity:'Uncommon', Ids:['ItemLootTreeNodes.NewGroup'] }); renderVisualBuilder(); };
  document.querySelectorAll('[data-spawner-field]').forEach((el)=>el.oninput=el.onchange=(e)=>{ const key=e.target.dataset.spawnerField; const kind=e.target.dataset.fieldKind; if(kind === 'boolean') obj[key] = e.target.value === 'true'; else if(kind === 'number') obj[key] = Number(e.target.value || 0); else obj[key] = e.target.value; });
  document.querySelectorAll('[data-group-rarity]').forEach((el)=>el.onchange=(e)=>{ const index=Number(e.target.dataset.groupRarity); obj.Nodes[index].Rarity=e.target.value; });
  document.querySelectorAll('[data-group-ids]').forEach((el)=>{ el.onfocus=()=>{ state.focusedLootField = { kind:'spawner', index:Number(el.dataset.groupIds) }; }; el.oninput=(e)=>{ const index=Number(e.target.dataset.groupIds); obj.Nodes[index].Ids=e.target.value.split(/\r?\n/).map((value)=>value.trim()).filter(Boolean); delete obj.Nodes[index].Node; delete obj.Nodes[index].Name; delete obj.Nodes[index].Ref; }; });
  document.querySelectorAll('[data-group-remove]').forEach((el)=>el.onclick=(e)=>{ obj.Nodes.splice(Number(e.target.dataset.groupRemove), 1); renderVisualBuilder(); });
  document.querySelectorAll('[data-group-dup]').forEach((el)=>el.onclick=(e)=>{ const index=Number(e.target.dataset.groupDup); obj.Nodes.splice(index + 1, 0, JSON.parse(JSON.stringify(obj.Nodes[index]))); renderVisualBuilder(); });
  document.querySelectorAll('[data-group-up]').forEach((el)=>el.onclick=(e)=>{ const index=Number(e.target.dataset.groupUp); if(index<=0) return; [obj.Nodes[index - 1], obj.Nodes[index]] = [obj.Nodes[index], obj.Nodes[index - 1]]; renderVisualBuilder(); });
  document.querySelectorAll('[data-group-down]').forEach((el)=>el.onclick=(e)=>{ const index=Number(e.target.dataset.groupDown); if(index>=obj.Nodes.length - 1) return; [obj.Nodes[index + 1], obj.Nodes[index]] = [obj.Nodes[index], obj.Nodes[index + 1]]; renderVisualBuilder(); });
  bindNodeRefCatalogControls();
  bindLootUiControls();
  updateLootWorkspaceLayout();
  updateLootWorkspaceCopy();
  refreshLootDirtyState();
}
function renderVisualBuilder(){
  const obj = state.currentLootObject || {};
  const kind = state.currentLootAnalysis?.summary?.kind || detectLootKind(obj);
  if(kind === 'node_tree') return renderTreeNodeBuilder(obj);
  if(kind === 'spawner') return renderSpawnerBuilder(obj);
  if(kind === 'node') return renderFlatNodeBuilder(obj);
  $('visual-builder').innerHTML=`<div class="loot-builder-shell"><div class="builder-guide-card"><h4>${escapeHtml(uiText('schema นี้ยังไม่มีตัวช่วยแบบภาพเต็ม ๆ', 'This schema still needs a stronger visual helper'))}</h4><p class="muted">${escapeHtml(uiText('ตอนนี้แนะนำให้ใช้สรุปด้านซ้ายกับ Raw JSON คู่กันก่อน เพื่อไม่ให้แก้ผิดตำแหน่ง', 'For now, use the summary panel together with the Raw JSON view so you do not edit the wrong part of the file.'))}</p></div></div>`;
}

async function globalSearch(){ const term=$('global-search-term').value.trim(); if(!term) return showToast('Enter something to search',true); const data=await api(`/api/search?term=${encodeURIComponent(term)}`); $('global-search-results').innerHTML=data.results.length ? data.results.map(r=>`<div class="result-card"><div class="info-pair"><span>${escapeHtml(r.path)}</span><strong>${escapeHtml(r.type)}</strong></div>${(r.matches||[]).slice(0,6).map(m=>`<div class="muted">${escapeHtml(m.path)}: ${escapeHtml(m.preview)}</div>`).join('')}</div>`).join('') : '<div class="muted">No matches found.</div>'; }

async function loadAnalyzer(){ const data=await api('/api/analyzer/overview'); state.analyzer=data.overview; const o=data.overview; $('analyzer-stats').innerHTML=`<div class="card stat"><span class="stat-label">Nodes</span><strong>${o.totals.nodes}</strong></div><div class="card stat"><span class="stat-label">Spawners</span><strong>${o.totals.spawners}</strong></div><div class="card stat"><span class="stat-label">Unique items</span><strong>${o.totals.uniqueItems}</strong></div><div class="card stat"><span class="stat-label">Missing refs</span><strong>${o.missingRefs.length}</strong></div>`; const totalCats=Object.values(o.categoryCounts).reduce((a,b)=>a+b,0)||1; $('analyzer-categories').innerHTML=Object.entries(o.categoryCounts).map(([k,v])=>`<div class="bar-row"><span>${escapeHtml(k)}</span><div class="bar"><div class="fill" style="width:${(v/totalCats)*100}%"></div></div><strong>${v}</strong></div>`).join(''); $('analyzer-missing').innerHTML=o.missingRefs.length?o.missingRefs.map(x=>`<div class="file-item static"><strong>${escapeHtml(x.nodeName)}</strong><span class="item-sub">not found on disk</span></div>`).join(''):'<div class="muted">No missing node refs.</div>'; $('analyzer-unused').innerHTML=o.unusedNodes.length?o.unusedNodes.map(x=>`<div class="file-item static"><strong>${escapeHtml(x.nodeName)}</strong><span class="item-sub">${escapeHtml(x.path||'')}</span></div>`).join(''):'<div class="muted">No unused nodes.</div>'; $('analyzer-top-items').innerHTML=o.topItems.map(x=>`<div class="result-card"><strong>${escapeHtml(x.name)}</strong><div class="muted">appears in ${x.count} rows</div></div>`).join('') || '<div class="muted">No items.</div>'; }


async function loadGraph(){
  const focus = $('graph-filter').value || '';
  const data=await api(`/api/graph?focus=${encodeURIComponent(focus)}`);
  state.graph={nodes:data.nodes,edges:data.edges,neighborhood:data.neighborhood||[],focus:data.focus||null};
  renderGraph();
}
function renderGraph(){
  const term=($('graph-filter').value||'').toLowerCase();
  const nodeMap=new Map(state.graph.nodes.map(n=>[n.id,n]));
  const filteredEdges=state.graph.edges.filter(e=>{
    const a=nodeMap.get(e.from), b=nodeMap.get(e.to);
    const hay=`${a?.label||''} ${b?.label||''}`.toLowerCase();
    return !term||hay.includes(term);
  }).slice(0,800);
  const groups={};
  filteredEdges.forEach(e=>{
    const from=nodeMap.get(e.from); const to=nodeMap.get(e.to);
    if(!from||!to) return;
    const key=`${from.kind}:${from.label}`;
    (groups[key] ||= { from, list: [] }).list.push({ to, kind: to.kind });
  });
  $('graph-canvas').innerHTML=Object.keys(groups).length ? Object.values(groups).sort((a,b)=>a.from.label.localeCompare(b.from.label)).map(group=>`<div class="graph-group graph-card" data-graph-focus="${escapeHtml(group.from.label)}"><h4><span class="tag ${group.from.kind}">${escapeHtml(group.from.kind)}</span> ${escapeHtml(group.from.label)}</h4>${group.list.slice(0,60).map(x=>`<div class="graph-edge">→ <span class="tag ${x.kind}">${escapeHtml(x.kind)}</span> ${escapeHtml(x.to.label)}</div>`).join('')}${group.list.length>60?`<div class="muted">+ ${group.list.length-60} more</div>`:''}</div>`).join('') : '<div class="muted">No graph data for current filter.</div>';
  document.querySelectorAll('[data-graph-focus]').forEach((el)=>el.onclick=()=>{ $('graph-filter').value=el.dataset.graphFocus; loadGraph().catch(err=>showToast(err.message,true)); });
  renderGraphFocus();
}
function renderGraphFocus(){
  const neighborhood=(state.graph.neighborhood||[]);
  if(!neighborhood.length){ $('graph-focus-summary').innerHTML = `<div class="muted">${t('noFocusSelected')}</div>`; return; }
  const counts = neighborhood.reduce((acc,n)=>{ acc[n.kind]=(acc[n.kind]||0)+1; return acc; }, {});
  $('graph-focus-summary').innerHTML = `<div class="info-pair"><span>Focus</span><strong>${escapeHtml(state.graph.focus || $('graph-filter').value || '-')}</strong></div><div class="info-pair"><span>Nodes in neighborhood</span><strong>${neighborhood.length}</strong></div><div class="muted">${t('graphCounts')}: ${Object.entries(counts).map(([k,v])=>`${k}=${v}`).join(' · ')}</div><div class="graph-focus-list">${neighborhood.slice(0,120).map(n=>`<div class="result-card"><strong><span class="tag ${n.kind}">${escapeHtml(n.kind)}</span> ${escapeHtml(n.label)}</strong><div class="muted">${escapeHtml(n.path || '')}</div></div>`).join('')}</div>`;
}


async function lootAutoFix(apply=false){
  if(!state.selectedLootPath) return showToast('Select a loot file first', true);
  const data = await api('/api/loot/autofix', { method:'POST', body: JSON.stringify({ path: state.selectedLootPath, apply, reloadAfter: apply }) });
  $('diff-output').textContent = data.patch || '';
  $('loot-autofix-notes').innerHTML = (data.warnings?.length ? data.warnings.map(x=>`<div class="muted">• ${escapeHtml(x)}</div>`).join('') : '<div class="muted">No autofix changes were needed.</div>') + (!apply && data.content ? `<div class="actions tight"><button id="apply-autofix-draft" class="tiny" data-t-apply-draft>Load autofix draft</button></div>` : '');
  if (apply) {
    showToast('Auto-fix applied');
    await openLootFile(state.selectedLootPath);
  } else {
    state.autoFixDraft = data.content;
    const btn = $('apply-autofix-draft'); if (btn) btn.onclick = applyAutoFixDraftToEditor;
    applyTranslations();
    showToast(state.lang==='th' ? 'พรีวิวการแก้อัตโนมัติพร้อมแล้ว' : 'Auto-fix preview ready.');
    setView('diff');
  }
}

function applyAutoFixDraftToEditor(){
  if(!state.autoFixDraft) return;
  $('loot-editor').value = state.autoFixDraft;
  try { state.currentLootObject = JSON.parse(state.autoFixDraft); renderVisualBuilder(); } catch {}
  showToast(state.lang==='th' ? 'โหลด draft การแก้อัตโนมัติเข้า editor แล้ว' : 'Auto-fix draft loaded into editor');
}

async function lootAutoFix(apply=false){
  if(!state.selectedLootPath) return showToast('Select a loot file first', true);
  const data = await api('/api/loot/autofix', { method:'POST', body: JSON.stringify({ path: state.selectedLootPath, apply, reloadAfter: false }) });
  $('diff-output').textContent = data.patch || '';
  $('loot-autofix-notes').innerHTML = renderAutoFixNotes(data) + (!apply && data.content ? `<div class="actions tight"><button id="apply-autofix-draft" class="tiny" data-t-apply-draft>Load autofix draft</button></div>` : '');
  if (apply) {
    showToast(state.lang==='th' ? 'แก้อัตโนมัติและบันทึกแล้ว' : 'Auto-fix applied and saved.');
    await openLootFile(state.selectedLootPath);
    return;
  }
  state.autoFixDraft = data.content;
  const btn = $('apply-autofix-draft'); if (btn) btn.onclick = applyAutoFixDraftToEditor;
  applyTranslations();
  showToast(state.lang==='th' ? 'พรีวิวการแก้อัตโนมัติพร้อมแล้ว' : 'Auto-fix preview ready.');
  setView('diff');
}

async function loadProfiles(){ const data=await api('/api/profiles'); state.profiles=data.profiles||[]; renderProfiles(); }
function renderProfiles(){ $('profiles-list').innerHTML=state.profiles.length ? state.profiles.map(p=>`<button class="file-item ${p.id===state.selectedProfileId?'active':''}" data-profile-id="${p.id}"><strong>${escapeHtml(p.name)}</strong><span class="item-sub">${p.fileCount} files · ${fmtDate(p.updatedAt)}</span><span class="item-sub">${escapeHtml(p.notes||'')}</span></button>`).join('') : `<div class="muted">${state.lang==='th' ? 'ยังไม่มีโปรไฟล์' : 'No profiles yet.'}</div>`; document.querySelectorAll('[data-profile-id]').forEach((b)=>b.onclick=()=>selectProfile(b.dataset.profileId)); renderProfileDetail(); renderRotationEntries(); }
function selectProfile(id){ state.selectedProfileId=id; renderProfiles(); }
function renderProfileDetail(){ const p=state.profiles.find(x=>x.id===state.selectedProfileId); $('profile-detail').innerHTML = p ? `<div class="info-pair"><span>${t('profileNamePrompt')}</span><strong>${escapeHtml(p.name)}</strong></div><div class="info-pair"><span>${t('files')}</span><strong>${p.fileCount}</strong></div><div class="info-pair"><span>${t('updated')}</span><strong>${fmtDate(p.updatedAt)}</strong></div><p class="muted">${escapeHtml(p.notes||'')}</p>` : `<div class="muted">${t('selectProfileHint')}</div>`; }
async function createProfile(){ const name=prompt(t('profileNamePrompt')); if(!name) return; const notes=prompt(t('profileNotesPrompt'))||''; await api('/api/profiles',{method:'POST',body:JSON.stringify({name,notes})}); showToast(t('profileCreated')); await loadProfiles(); await loadRotation(); }
async function applySelectedProfile(){ if(!state.selectedProfileId) return showToast(t('selectProfileFirst'),true); const data=await api('/api/profiles/apply',{method:'POST',body:JSON.stringify({id:state.selectedProfileId,reloadAfter:true})}); writeConsole(data.commandResult?.output||'Profile applied'); showToast(t('profileApplied')); }
async function deleteSelectedProfile(){ if(!state.selectedProfileId) return showToast(t('selectProfileFirst'),true); if(!confirm(t('deleteProfileConfirm'))) return; await api(`/api/profiles?id=${encodeURIComponent(state.selectedProfileId)}`,{method:'DELETE'}); state.selectedProfileId=''; showToast(t('profileDeleted')); await loadProfiles(); await loadRotation(); }

async function loadRotation(){ const data=await api('/api/rotation'); state.rotation=data.rotation||{enabled:false,everyMinutes:0,entries:[]}; $('rotation-enabled').checked=!!state.rotation.enabled; $('rotation-minutes').value=Number(state.rotation.everyMinutes||0); $('rotation-status').textContent = `${t('nextRun')}: ${state.rotation.nextRunAt ? fmtDate(state.rotation.nextRunAt) : t('notScheduled')}`; renderRotationEntries(); }
function renderRotationEntries(){ const profiles=state.profiles; const entries=(state.rotation.entries&&state.rotation.entries.length?state.rotation.entries:[{profileId:'',enabled:true}]); $('rotation-entries').innerHTML=entries.map((entry,idx)=>`<div class="visual-row"><select data-rotation-profile="${idx}"><option value="">${t('selectedProfile')}</option>${profiles.map(p=>`<option value="${p.id}" ${p.id===entry.profileId?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}</select><label class="checkline"><input type="checkbox" data-rotation-enabled="${idx}" ${entry.enabled!==false?'checked':''}/> <span>${t('enableRotation')}</span></label><button data-remove-rotation="${idx}" class="danger-outline tiny">Remove</button></div>`).join('') + '<button id="rotation-add" class="ghost tiny">Add entry</button>'; document.querySelectorAll('[data-rotation-profile]').forEach((el)=>el.onchange=(e)=>{ state.rotation.entries[Number(e.target.dataset.rotationProfile)].profileId=e.target.value; }); document.querySelectorAll('[data-rotation-enabled]').forEach((el)=>el.onchange=(e)=>{ state.rotation.entries[Number(e.target.dataset.rotationEnabled)].enabled=e.target.checked; }); document.querySelectorAll('[data-remove-rotation]').forEach((el)=>el.onclick=(e)=>{ state.rotation.entries.splice(Number(e.target.dataset.removeRotation),1); renderRotationEntries(); }); $('rotation-add').onclick=()=>{ state.rotation.entries = state.rotation.entries || []; state.rotation.entries.push({profileId:'', enabled:true}); renderRotationEntries(); }; }
async function saveRotation(){ state.rotation.enabled=$('rotation-enabled').checked; state.rotation.everyMinutes=Number($('rotation-minutes').value||0); const data=await api('/api/rotation',{method:'PUT',body:JSON.stringify(state.rotation)}); state.rotation=data.rotation; $('rotation-status').textContent = `${t('nextRun')}: ${state.rotation.nextRunAt ? fmtDate(state.rotation.nextRunAt) : t('notScheduled')}`; showToast(t('rotationSaved')); }
async function runRotationNow(){ const data=await api('/api/rotation/run',{method:'POST',body:JSON.stringify({force:true})}); if(data.commandResult?.output) writeConsole(data.commandResult.output); $('rotation-status').textContent = data.ran ? `${t('rotationApplied')}: ${data.activeProfile?.name || ''}. ${t('nextRun')}: ${data.nextRunAt ? fmtDate(data.nextRunAt) : t('notScheduled')}` : `${state.lang==='th' ? 'การหมุนยังไม่ทำงาน' : 'Rotation did not run'}: ${data.reason}`; showToast(data.ran ? t('rotationApplied') : `Rotation skipped: ${data.reason}`); }

async function loadBackups(){ const data=await api('/api/backups'); $('backups-list').innerHTML = data.backups.map(b=>`<button class="file-item ${b.name===state.selectedBackup?'active':''}" data-backup="${b.name}"><strong>${b.name}</strong><span class="item-sub">${fmtDate(b.updatedAt)}</span></button>`).join('') || `<div class="muted">${state.lang==='th' ? 'ยังไม่มีแบ็กอัป' : 'No backups yet.'}</div>`; document.querySelectorAll('[data-backup]').forEach((b)=>b.onclick=()=>openBackup(b.dataset.backup)); }
async function openBackup(name){ state.selectedBackup=name; const data=await api(`/api/backup/files?backup=${encodeURIComponent(name)}`); $('backup-files-list').innerHTML=data.files.map(f=>`<button class="file-item ${f.relPath===state.selectedBackupFile?'active':''}" data-backup-file="${f.relPath}"><strong>${escapeHtml(f.relPath)}</strong><span class="item-sub">${f.size} ${t('bytes')} · ${fmtDate(f.updatedAt)}</span></button>`).join(''); document.querySelectorAll('[data-backup-file]').forEach((b)=>b.onclick=()=>openBackupFile(b.dataset.backupFile)); await loadBackups(); }
async function openBackupFile(relPath){ state.selectedBackupFile=relPath; const data=await api(`/api/backup/file?backup=${encodeURIComponent(state.selectedBackup)}&path=${encodeURIComponent(relPath)}`); $('backup-file-preview').textContent=data.content; }
async function restoreBackupFile(){ if(!state.selectedBackup || !state.selectedBackupFile) return showToast(state.lang==='th' ? 'เลือกแบ็กอัปและไฟล์ก่อน' : 'Select a backup and file first', true); if(!confirm(`${t('restoreBackupConfirm')}
${state.selectedBackupFile}
${state.selectedBackup}`)) return; await api('/api/restore',{method:'POST',body:JSON.stringify({backup:state.selectedBackup, path:state.selectedBackupFile})}); showToast(t('fileRestored')); }
async function loadActivity(){ const data=await api('/api/activity?limit=200'); $('activity-log').textContent=data.entries.map(e=>JSON.stringify(e,null,2)).join('\n\n'); }

async function refreshAll(){
  await loadBootstrap();
  renderCoreFileList();
  if(!state.bootstrap?.health?.configPathExists){ clearWorkspaceViews(); return; }
  const tasks = [loadParsedServerSettings(), loadProfiles(), loadRotation(), loadBackups(), loadActivity()];
  const lootReady = Boolean(state.bootstrap?.fileHealth?.Nodes) && Boolean(state.bootstrap?.fileHealth?.Spawners);
  if(lootReady) tasks.push(loadLootFiles(), loadAnalyzer(), loadGraph(), loadItemCatalog(), loadNodeRefCatalog());
  else clearLootViews();
  await Promise.allSettled(tasks);
  if(state.selectedCorePath) openCoreFile(state.selectedCorePath).catch(()=>{});
  const routeLootPath = state.pendingRouteLootPath || '';
  if(lootReady && routeLootPath) {
    state.pendingRouteLootPath = '';
    openLootFile(routeLootPath, { fromRoute: true }).catch((error)=>showToast(error.message || String(error), true));
  } else if(lootReady && state.selectedLootPath) {
    openLootFile(state.selectedLootPath, { fromRoute: true }).catch(()=>{});
  }
}

function bindEvents(){
  document.querySelectorAll('.nav').forEach((b)=>b.onclick=()=>setView(b.dataset.view));
  $('global-refresh').onclick=refreshAll; $('global-backup').onclick=backupCore; $('global-reload').onclick=()=>runAction('/api/action/reload-loot'); $('global-restart').onclick=()=>runAction('/api/action/restart-server'); $('clear-console').onclick=()=>writeConsole('');
  $('save-config-btn').onclick=saveConfig; $('check-config-btn').onclick=()=>checkConfigFolder(); $('discover-config-btn').onclick=()=>discoverConfigFolders().catch((error)=>showToast(error.message, true)); if($('cfg-reload-cmd')) $('cfg-reload-cmd').addEventListener('input', ()=>{ state.commandDraftHealth.reload = null; renderCommandAssist(); }); if($('cfg-restart-cmd')) $('cfg-restart-cmd').addEventListener('input', ()=>{ state.commandDraftHealth.restart = null; renderCommandAssist(); }); $('global-search-btn').onclick=globalSearch; $('global-search-term').addEventListener('keydown',(e)=>{ if(e.key==='Enter') globalSearch(); });
  $('server-field-filter').oninput=renderParsedServerGrid; $('server-section-filter').onchange=renderParsedServerGrid; $('server-group-filter').onchange=renderParsedServerGrid; $('reload-server-parsed').onclick=loadParsedServerSettings; $('save-server-parsed').onclick=()=>saveParsedServer(false); $('save-server-parsed-reload').onclick=()=>saveParsedServer(true);
  $('core-preview-diff').onclick=()=>previewDiff(state.selectedCorePath, $('core-editor').value); $('core-save').onclick=saveCoreFile;
  $('loot-search').oninput=renderLootLists;
  $('new-node-btn').onclick=()=>createLootFile('nodes');
  $('new-spawner-btn').onclick=()=>createLootFile('spawners');
  $('loot-preview-diff').onclick=()=>previewDiff(state.selectedLootPath, $('loot-editor').classList.contains('hidden') ? fmtJson(state.currentLootObject) : $('loot-editor').value);
  $('loot-save').onclick=()=>saveLoot(false);
  $('loot-save-reload').onclick=()=>saveLoot(true);
  $('simulate-btn').onclick=simulateLoot;
  $('clone-loot').onclick=cloneLootFile;
  $('delete-loot').onclick=deleteLootFile;
  $('toggle-visual').onclick=()=>setLootEditorMode('visual');
  $('toggle-raw').onclick=()=>setLootEditorMode('raw');
  $('loot-files-toggle').onclick=()=>{ if(state.lootUi.focusMode) state.lootUi.focusMode = false; state.lootUi.showFiles = !state.lootUi.showFiles; updateLootWorkspaceLayout(); };
  $('loot-inspector-toggle').onclick=()=>{ if(state.lootUi.focusMode) state.lootUi.focusMode = false; state.lootUi.showInspector = !state.lootUi.showInspector; updateLootWorkspaceLayout(); };
  $('loot-focus-toggle').onclick=()=>{ state.lootUi.focusMode = !state.lootUi.focusMode; if(!state.lootUi.focusMode){ state.lootUi.showFiles = true; state.lootUi.showInspector = true; } updateLootWorkspaceLayout(); };
  $('loot-reset-layout').onclick=()=>{ state.lootUi.focusMode = false; state.lootUi.showFiles = true; state.lootUi.showInspector = true; updateLootWorkspaceLayout(); };
  $('loot-editor').oninput=()=>refreshLootDirtyState();
  $('visual-builder').addEventListener('input', ()=>refreshLootDirtyState(), true);
  $('visual-builder').addEventListener('change', ()=>refreshLootDirtyState(), true);
  document.querySelectorAll('[data-kit]').forEach((b)=>b.onclick=()=>applyKit(b.dataset.kit));
  $('refresh-analyzer').onclick=loadAnalyzer; $('refresh-graph').onclick=loadGraph; $('graph-filter').oninput=()=>loadGraph().catch(err=>showToast(err.message,true)); $('loot-autofix-preview').onclick=()=>lootAutoFix(false); $('loot-autofix-apply').onclick=()=>lootAutoFix(true);
  $('profile-create').onclick=createProfile; $('refresh-profiles').onclick=async()=>{ await loadProfiles(); await loadRotation(); }; $('profile-apply').onclick=applySelectedProfile; $('profile-delete').onclick=deleteSelectedProfile; $('rotation-save').onclick=saveRotation; $('rotation-run').onclick=runRotationNow;
  $('refresh-backups').onclick=loadBackups; $('restore-backup-file').onclick=restoreBackupFile; $('refresh-activity').onclick=loadActivity; $('diff-output').ondblclick=applyAutoFixDraftToEditor;
  document.addEventListener('keydown', (event)=>{
    const isSave = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's';
    if(!isSave) return;
    if(state.view !== 'loot' || !state.selectedLootPath) return;
    event.preventDefault();
    saveLoot(false).catch((error)=>showToast(error.message, true));
  });
  window.addEventListener('beforeunload', (event)=>{
    if(!state.lootUi.dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });
  window.addEventListener('popstate', setViewFromRoute);
}

bindEvents();
$('lang-toggle').onclick=()=>setLanguage(state.lang==='en'?'th':'en');
updateLootWorkspaceLayout();
updateLootWorkspaceCopy();
setLanguage(state.lang);
setViewFromRoute();
refreshAll().catch((error)=>{ setStatus(false, error.message); showToast(error.message, true); });



function treeNodeMatchesSearch(node, term){
  if(!term) return true;
  if(!node || typeof node !== 'object') return false;
  const query = String(term).trim().toLowerCase();
  if(!query) return true;
  const hay = `${node.Name || ''} ${node.Rarity || ''}`.toLowerCase();
  if(hay.includes(query)) return true;
  const children = Array.isArray(node.Children) ? node.Children : [];
  return children.some((child)=>treeNodeMatchesSearch(child, query));
}

function countVisibleTreeNodes(node, term){
  if(!node || typeof node !== 'object') return 0;
  const matches = treeNodeMatchesSearch(node, term);
  const children = Array.isArray(node.Children) ? node.Children : [];
  if(!children.length) return matches ? 1 : 0;
  const childCount = children.reduce((sum, child)=>sum + countVisibleTreeNodes(child, term), 0);
  if(String(term || '').trim()) return childCount + (matches ? 1 : 0);
  return childCount + 1;
}
