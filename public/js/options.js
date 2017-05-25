document.addEventListener('DOMContentLoaded', init);

let state = {};
const apis = ['btce', 'poloniex', 'kraken', 'bittrex'];

function init() {
    const keys = _(apis).map(e => (
        [[`${e}Key`, ''], [`${e}Secret`, ''], [`${e}Options`, {}]]
    )).flatten().fromPairs().value();
    chrome.storage.sync.get(keys, function(storage_state) {
        state = storage_state;
        init_view(state)
    });

}

function init_view(state) {
    _.each(apis, api => {
        bind_edit(`${api}Key`, api)
        bind_edit(`${api}Secret`, api)
    })
}

function bind_edit(name, api) {
    const el = document.getElementById(name);
    el.value = state[name] || ''
    el.addEventListener('change', function(e) {
        const value = el.value
        chrome.storage.sync.set({
            [name]: value,
        })
        if(_gaq && is_save_complete(api)) {
            _gaq.push(['_trackEvent', 'Added API', api]);
        }
    })
}

function is_save_complete(api) {
    return !!(document.getElementById(`${api}Key`).value.length
        && document.getElementById(`${api}Secret`).value.length)
}
