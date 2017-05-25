(function(root){
    const BTCE_API = function(apiKey, secretKey, options) {
        let nonce = options.nonce || 1;

        function call_api(method, payload = {}, callback) {
            let request = {
                method,
                nonce,
            }

            chrome.storage.sync.set({
                btceOptions: {
                    nonce: ++nonce
                }
            })

            const data = new FormData();
            for(key in request) {
                data.append( key, request[key] );
            }

            return fetch('https://btc-e.nz/tapi', {
                method: 'POST',
                headers: {
                    Key: apiKey,
                    Sign: getHMACSecret( http_build_query(request), secretKey ),
                },
                body: data,
            }).then(function(response) {
                return response.json();
            })
        }
        const get_balance = function(callback){
            call_api('getInfo', {}).then(function(response) {
                const { success, error } = response;
                if(!success) {
                    console.warn('BTC-e', 'getInfo', error);
                    chrome.storage.sync.set({
                        btceOptions: {
                            nonce: nonce+100
                        }
                    })
                    return callback({ error: response })
                }
                const { return: { funds } } = response;

                let my_currencies = [];
                for(currency_name in funds) {
                    if(funds[currency_name] != 0) {
                        my_currencies.push(currency_name)
                    }
                }
                let balance = {
                    total: {
                        btc: 0,
                        usd: 0,
                    }
                }
                get_currencies_prices(my_currencies).then(function(response) {
                    my_currencies.forEach(function(currency) {
                        const amount = funds[currency];
                        balance[currency] = {
                            btc: 0, usd: 0,
                            [currency]: amount,
                            name: currency,
                        };

                        if(currency !== 'usd'){
                            const name = get_pair_name(currency, 'usd')
                            const price = response[name].last;
                            if(currency != 'rur') {
                                balance[currency].usd = price * amount
                                balance.total.usd += balance[currency].usd
                            } else {
                                balance[currency].usd = amount / price
                                balance.total.usd += balance[currency].usd
                            }
                        } else {
                            balance[currency].usd = amount
                            balance.total.usd += amount;
                        }

                        if(currency !== 'btc'){
                            const name = get_pair_name(currency, 'btc');
                            const price = response[name].last;
                            if(currency != 'rur' && currency != 'usd') {
                                balance[currency].btc = price * amount
                                balance.total.btc += balance[currency].btc
                            } else {
                                balance[currency].btc = amount / price
                                balance.total.btc += balance[currency].btc
                            }
                        } else {
                            balance[currency].btc = amount
                            balance.total.btc += amount;
                        }
                    })
                    callback(balance)
                })
            })
        }

        function get_pair_name(currency, main_currency) {
            if(main_currency === 'usd') {
                return (currency == 'rur') ? 'usd_rur' : `${currency}_usd`
            } else {
                return (currency == 'rur' || currency == 'usd') ? `btc_${currency}` : `${currency}_btc`
            }
        }

        function get_currencies_prices(currencies) {
            let query = [];
            currencies.forEach(function(currency) {
                if(currency !== 'usd') {
                    query.push(get_pair_name(currency, 'usd'))
                }
                if(currency !== 'btc') {
                    query.push(get_pair_name(currency, 'btc'))
                }
            })
            return fetch(`https://btc-e.nz/api/3/ticker/${_.uniq(query).join('-')}`).
                then(function(response){
                    return response.json();
                })
        }

        return {
            call_api,
            get_balance,
        }
    }
    root['btce_api'] = BTCE_API;
})(window)
