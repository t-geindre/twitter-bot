import Cookie from './lib/cookie.js';
import TwitterClient from './lib/Twitter/client.js';
import TwitterBot from './lib/Twitter/bot.js';

export default class
{
    constructor(config, options)
    {
        this.config = config;
        this.options = options;
        this.handelingTweets = [];
        this.errorCount = 0;

        this
            .interceptApiHeaders()
            .then(
                headers => this.client = new TwitterClient(
                    this.config.api.baseUrl,
                    new Proxy(headers, {
                        get: (target, key) => key == 'x-csrf-token' ? Cookie.get('ct0') : target[key],
                        set: (target, key, value) => target[key] = value,
                    })
                )
            )
            .then(() => this.bots = this.config.bots.map(bot => new TwitterBot(bot, this.client)))
        ;
    }

    interceptApiHeaders()
    {
        return new Promise((resolv, reject) => {
            let
                oldOpen = XMLHttpRequest.prototype.open,
                oldSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader,
                oldSend = XMLHttpRequest.prototype.send,
                app = this
            ;

            XMLHttpRequest.prototype.open = function(method, url) {
                if (url.substr(0, app.config.api.baseUrl.length) === app.config.api.baseUrl) {
                    this.xHeadersLog = {};
                }

                return oldOpen.apply(this, arguments);
            }

            XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
                if (this.xHeadersLog) {
                    this.xHeadersLog[header] = value;
                }

                return oldSetRequestHeader.apply(this, arguments);
            }

            XMLHttpRequest.prototype.send = function() {
                if (this.xHeadersLog) {
                    XMLHttpRequest.prototype.open = oldOpen;
                    XMLHttpRequest.prototype.send = oldSend;
                    XMLHttpRequest.prototype.setRequestHeader = oldSetRequestHeader;
                    resolv(this.xHeadersLog);
                }

                return oldSend.apply(this, arguments);
            }
        });
    }
}
