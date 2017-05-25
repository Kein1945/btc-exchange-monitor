(function(root){
    const base_url = 'https://bittrex.com/api/v1.1';
    const BITTREX_API = function(apiKey, secretKey, options) {
        let nonce = options.nonce || 1;

        function call_api(method, payload = {}, callback) {
            let request = {
                method,
                nonce,
            }

            chrome.storage.sync.set({
                bittrexOptions: {
                    nonce: ++nonce
                }
            })

            const data = new FormData();
            for(key in request) {
                data.append( key, request[key] );
            }

            const url = `${base_url}/account/${method}?apikey=${apiKey}&nonce=${nonce}`;

            return fetch(url, {
                method: 'POST',
                headers: {
                    apisign: getHMACSecret( url, secretKey ),
                },
                body: data,
            }).then(function(response) {
                return response.json();
            })
        }
        const get_balance = function(callback){
            call_api('getbalances', {}).then(function(response) {
                const { success } = response;
                if(!success) {
                    console.warn('Bittrex', 'getbalances', response);
                    chrome.storage.sync.set({
                        bittrexOptions: {
                            nonce: nonce+100
                        }
                    })
                    return callback({ error: response, message: response.message })
                }
                const funds = [];
                _.each(response.result, ({ Balance: amount, Currency: currency}) => {
                    funds.push({amount, currency})
                })
                let balance = { total: {btc: 0, usd: 0}};
                get_currencies_prices().then(response => {
                    if(response.success) {
                        const tickers = response.result;
                        _.each(funds, ({currency, amount}) => {
                            if('BTC' === currency.toUpperCase()) {
                                balance.total.btc += amount;
                                return
                            }
                            const ticker = _.find(tickers, function({MarketName: name}) {
                                return `BTC-${currency.toUpperCase()}` === name;
                            })
                            if (ticker) {
                                balance.total.btc += amount * ticker.Last;
                            }
                        })
                        const ticker = _.find(tickers, function({MarketName: name}) {
                            return `USDT-BTC` === name;
                        })
                        if (ticker) {
                            balance.total.usd += balance.total.btc * ticker.Last;
                        }

                        callback(balance)
                    } else {
                        callback({ error: response, message: response.message })
                    }
                })
            })
        }

        function get_currencies_prices() {
            return fetch('https://bittrex.com/api/v1.1/public/getmarketsummaries').
                then(function(response){
                    return response.json();
                })
        }

        return {
            call_api,
            get_balance,
        }
    }
    root['bittrex_api'] = BITTREX_API;
})(window)
