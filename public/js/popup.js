let apis = ['btce', 'poloniex', 'kraken', 'bittrex'];

function addExchange(idx, name, usd, btc) {
    const el = document.getElementById(`${idx}_exchange`);
    el.className = '';
    el.innerHTML =
        `<strong class="exchange">${name}</strong><span class="amount">${Math.floor(usd)} USD / ${btc.toFixed(2)} BTC</span>`;
}

function exchangeError(idx, message) {
    const el = document.getElementById(`${idx}_exchange`);
    el.className = '-error';
    el.innerHTML = message;
}

function reorderErrorsDown() {
    for(var i = 0, childs = document.querySelectorAll('#exchanges .-error'); i < childs.length; i++){
	       document.getElementById('exchanges').appendChild(childs[i])
    }
}

function addTotal(usd, btc) {
    document.getElementById('total').className = '';
    document.getElementById('total').innerHTML =
        `<strong class="exchange">Total</strong><span class="amount">${Math.floor(usd)} USD / ${btc.toFixed(2)} BTC</span>`;
}

const names = {
    btce: 'BTC-e',
    poloniex: 'Poloniex',
    bittrex: 'Bittrex',
    kraken: 'Kraken',
}

function title(name) {
    return names[name]
}


document.addEventListener('DOMContentLoaded', function() {
    const keys = _(apis).map(e => (
        [[`${e}Key`, ''], [`${e}Secret`, ''], [`${e}Options`, {}]]
    )).flatten().fromPairs().value();
    chrome.storage.sync.get(keys, function(storage) {
        let enabled_apis = 0;
        let total_btc = 0, total_usd = 0;
        _.each(apis, e => {
            const { [`${e}Key`]: key, [`${e}Secret`]: secret, [`${e}Options`]: options} = storage;
            if(key && secret) {
                const el = document.getElementById(`${e}_exchange`);
                el.className = 'exchange_loading';
                const api = window[`${e}_api`];
                if(!api) {
                    return exchangeError(e, `API ${title(e)} not found`)
                }
                const exchange = api(key, secret, options);
                exchange.get_balance(function(response){
                    if(!response.error) {
                        console.log(title(e), response)
                        addExchange(e, `${title(e)}:`, response.total.usd, response.total.btc)
                        total_btc += response.total.btc;
                        total_usd += response.total.usd;
                        if(enabled_apis > 1 ) {
                            addTotal(total_usd, total_btc)
                        }
                    } else {
                        const { message } = response;
                        exchangeError(e, `API ${title(e)}${message ? `: ${message}`:' response with error'}`);
                        reorderErrorsDown();
                        console.warn(response);
                    }
                })
                enabled_apis++;
                reorderErrorsDown();

            }
        })
        if(!enabled_apis) {
            document.getElementById('no_exchanges').className = '';
            document.getElementById('options_page').addEventListener('click', function(){
                chrome.tabs.create({ 'url': 'chrome://extensions/?options=' + chrome.runtime.id });
            })
        }
    })
});
