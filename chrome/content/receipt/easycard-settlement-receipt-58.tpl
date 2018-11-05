[&INIT]
{if store}
${store.name|center}
{/if}
${'結帳憑證'|center}
[&CR]
[&CR]
{if store}
${'門  市:'|left:16}${store.branch}
${'收銀機號:'|left:16}${store.terminal_no}
{/if}
{if display_name}
${'收銀員:'|left:16}${display_name}
{/if}
[&CR]
[&CR]
${'交易時間:'|left:16}${settlementData.txnDate}
{if settlementData.balance_flag == '0'}
${'平帳:'|left:16}${'平帳'}
{elseif settlementData.balance_flag == '1' || settlementData.balance_flage  == ''}
${'平帳:'|left:16}${'不平帳'}
{/if}
${'二代設備編號:'|left:16}${settlementData.deviceId}
${'批次號碼:'|left:16}${settlementData.batch_no}

{if settleDBInfo}
${'購貨筆數:'|left:16}${settleDBInfo.deduct_count}
${'總額:'|left:16}${settleDBInfo.deduct_total}
${'退貨筆數:'|left:16}${settleDBInfo.refund_count}
${'總額:'|left:16}${settleDBInfo.refund_total}
${'取消筆數:'|left:16}${settleDBInfo.cancel_count}
${'總額:'|left:16}${settleDBInfo.cancel_total}
${'自動加值筆數:'|left:16}${settleDBInfo.autoload_count}
${'總額:'|left:16}${settleDBInfo.autoload_total}
${'購貨類總筆數:'|left:16}${settleDBInfo.count}
${'總金額:'|left:16}${settleDBInfo.total}
${'總淨額:'|left:16}${settleDBInfo.net_sale}
[&CR]
[&CR]
${'交易總筆數:'|left:16}${settleDBInfo.count}
${'交易總額:'|left:16}${settleDBInfo.total}
{/if}
[&RESET]
[&CR]
[&CR]
[&CR]
[&CR]
[&CR]
[&PC]