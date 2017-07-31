{if typeof order != 'undefined' && typeof order.easycard != 'undefined'}
[&INIT]
{if store}
${''|left:6}${store.name+'(特店名稱)'|center}
{/if}
${''|left:6}${'悠遊卡交易證明(顧客聯)'|center}
[&CR]
[&CR]
{if store}
${''|left:6}${'門  市:'|left:16}${store.branch}
${''|left:6}${'收銀機號:'|left:16}${store.terminal_no}
{/if}
${''|left:6}${'收銀機交易序號:'|left:16}${order.seq}
${''|left:6}${'交易時間:'|left:16}${order.easycard.txnDate}
{if display_name}
${''|left:6}${'收銀員:'|left:16}${display_name}
{/if}
==========================================
[&CR]
${''|left:6}${'悠遊卡卡號:'|left:16}${order.easycard.cardId}
${''|left:6}${'交易類別:'|left:16}${_(order.easycard.txnType)}
[&CR]
{if order.easycard.deviceId}
${''|left:6}${'悠遊卡設備編號:'|left:16}${order.easycard.deviceId}
{/if}
{if order.easycard.batchNo}
${''|left:6}${'批次號碼:'|left:16}${order.easycard.batchNo}
{/if}
{if order.easycard.rrn}
${''|left:6}${'RRN:'|left:16}${order.easycard.rrn}
{/if}
[&CR]
{if order.easycard.rrn}
${''|left:6}${'交易前餘額:'|left:16}${order.easycard.oldBalance}
{/if}
{if order.easycard.autoloadAmount > 0}
${''|left:6}${'自動加值:'|left:16}${order.easycard.autoloadAmount}
{/if}
${''|left:6}${'交易金額:'|left:16}${order.easycard.txnAmount}
${''|left:6}${'交易後餘額:'|left:16}${order.easycard.balance}
[&CR]
==========================================
${''|left:6}${'備註:若有疑問請洽'}[&CR]
${''|left:6}${'悠遊卡公司專線：412-8880'}
${''|left:6}${'(手機及金馬地區請加 02)'}
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