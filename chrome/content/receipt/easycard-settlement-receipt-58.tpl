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