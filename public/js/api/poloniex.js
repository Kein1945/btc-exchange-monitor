(function(root){
    const POLONIEX_API = function(apiKey, secretKey, options) {
        let nonce = options.nonce || 1;

        function call_api(command, payload = {}) {
            let request = Object.assign({},{
                command,
                nonce,
            }, payload)

            chrome.storage.sync.set({
                poloniexOptions: {
                    nonce: ++nonce
                }
            })

            const data = new FormData();
            for(key in request) {
                data.append( key, request[key] );
            }

            return fetch('https://poloniex.com/tradingApi', {
                method: 'POST',
                headers: {
                    Key: apiKey,
                    Sign: getHMACSecret( http_build_query(request), secretKey ),
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
                },
                body: http_build_query(request),
            }).then(function(response) {
                return response.json();
            })
        }
        const get_balance = function(callback){
            call_api('returnCompleteBalances', {account: 'all'} ).then(function(response) {
                const { error } = response;
                if(error) {
                    console.warn('Poloniex', 'returnBalances', response);
                    chrome.storage.sync.set({
                        poloniexOptions: {
                            nonce: nonce+100
                        }
                    })
                    return callback({ error: response })
                }
                let balance = {total: {btc: 0}};
                _.map(response, ({btcValue}) => {
                    const amount = parseFloat(btcValue);
                    if(amount) {
                        balance.total.btc += amount;
                    }
                })
                get_currencies_prices().then(({USDT_BTC: {last: price}}) => {
                    balance.total.usd = price * balance.total.btc
                    callback(balance)
                })

            })
        }

        function get_currencies_prices() {
            return fetch('https://poloniex.com/public?command=returnTicker').
                then(function(response){
                    return response.json();
                })
        }

        return {
            call_api,
            get_balance,
        }
    }
    root['poloniex_api'] = POLONIEX_API;
})(window)
