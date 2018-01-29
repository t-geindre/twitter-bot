import Cookie from './lib/cookie.js';
import TwitterClient from './lib/Twitter/client.js';

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
            .then(
                () => this.setupSearchPolling()
            )
        ;
    }

    handleContestTweets(tweets)
    {
        tweets
            // get original tweet
            .map(tweet => tweet.retweeted_status ? tweet.retweeted_status : tweet)
            // check requirements
            .filter(tweet => (
                tweet.user.followers_count > this.config.contest.requirements.followers
                && tweet.retweet_count > this.config.contest.requirements.retweets
                && (
                    (new Date()).getTime() - (new Date(tweet.created_at)).getTime()
                ) / 86400 / 1000 <= this.config.contest.requirements.newerThan
            ))
            // remove duplicates
            .filter(tweet => {
                if (this.handelingTweets.indexOf(tweet.id) === -1) {
                    this.handelingTweets.push(tweet.id)
                    return true;
                }
                return false;
            })
            // RT + follow
            .map(tweet => {
                this.client.show(tweet.id_str)
                    .then(response => response.data)
                    .then(tweet => Promise
                        .all(tweet.entities.user_mentions.map(
                            user => this.client.follow(user.id_str)
                        ))
                        .then(() => tweet)
                    )
                    .then(tweet => Promise.all(
                        [
                            !tweet.user.following ? this.client.follow(tweet.user.id_str) : false,
                            !tweet.favorited ? this.client.favorite(tweet.id_str) : tweet,
                            !tweet.retweeted ? this.client.retweet(tweet.id_str) : tweet,
                        ]
                        .filter(item => !!item)
                    ))
                    .then(() => this.errorCount = 0)
                    .catch(response => {
                        if (response.status && response.status == 403) {
                            this.errorCount++;
                            this.pauseSearchPolling();
                        }
                    })
            })
        ;
    }

    pauseSearchPolling()
    {
        if (this.searchPollingId) {
            clearInterval(this.searchPollingId);
            setTimeout(
                () => this.setupSearchPolling(),
                this.config.api.pauseDurationOnError * this.errorCount
            );
        }
        this.searchPollingId = false;
    }

    setupSearchPolling()
    {
        let since_id = null;
        let pollFunc = () => {
            this.client.search({
                q: this.config.contest.search,
                result_type: 'mixed',
                count: 100,
                include_entities: 1,
                since_id,
            }).then(response => {
                since_id = response.data.search_metadata.max_id_str;
                this.handleContestTweets(response.data.statuses);
            });
        };

        this.searchPollingId = setInterval(pollFunc, this.config.contest.pollInterval);
        pollFunc();
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
