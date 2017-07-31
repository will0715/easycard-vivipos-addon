{if typeof order != 'undefined' && typeof order.easycard != 'undefined'}
[&INIT]
{if store}
${store.name+'(特店名稱)'|center}
{/if}
${'悠遊卡交易證明(顧客聯)'|center}
[&CR]
[&CR]
{if store}
${'門  市:'|left:16}${store.branch}
${'收銀機號:'|left:16}${store.terminal_no}
{/if}
${'收銀機交易序號:'|left:16}${order.seq}
${'交易時間:'|left:16}${order.easycard.txnDate}
{if display_name}
${'收銀員:'|left:16}${display_name}
{/if}
==========================================
[&CR]
${'悠遊卡卡號:'|left:16}${order.easycard.cardId}
${'交易類別:'|left:16}${_(order.easycard.txnType)}
[&CR]
{if order.easycard.deviceId}
${'悠遊卡設備編號:'|left:16}${order.easycard.deviceId}
{/if}
{if order.easycard.batchNo}
${'批次號碼:'|left:16}${order.easycard.batchNo}
{/if}
{if order.easycard.rrn}
${'RRN:'|left:16}${order.easycard.rrn}
{/if}
[&CR]
{if order.easycard.rrn}
${'交易前餘額:'|left:16}${order.easycard.oldBalance}
{/if}
{if order.easycard.autoloadAmount > 0}
${'自動加值:'|left:16}${order.easycard.autoloadAmount}
{/if}
${'交易金額:'|left:16}${order.easycard.txnAmount}
${'交易後餘額:'|left:16}${order.easycard.balance}
[&CR]
==========================================
${'備註:若有疑問請洽'}[&CR]
${'悠遊卡公司專線：412-8880'}
${'(手機及金馬地區請加 02)'}
[&CR]
[&RESET]
[&CR]
[&CR]
[&CR]
[&CR]
[&CR]
[&PC]
[&CR]
[&CR]
[&CR]
{/if}