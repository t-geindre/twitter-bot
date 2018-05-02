import defaults from 'lodash/defaultsDeep';

export default class
{
    constructor(config, client)
    {
        this.client = client;
        this.handled = {};
        this.config = defaults(config, {
            search: { q: '' },
            pollInterval: 60000,
            requirements: {
                user: {
                    followers: 0,
                },
                retweets: 0,
                // newerThan: 10, // days
                // olderThan: 10,
            },
            actions: {
                follow: {
                    user: false,
                    mentionned: false,
                },
                copy: false,
                favorite: false,
                retweet: false,
                reply: false
            }
        });

        this.setupSearchPolling();
    }

    setupSearchPolling()
    {
        let since_id = null;
        let pollFunc = () => {
            this.client.search(this.config.search).then(response => {
                since_id = response.json.search_metadata.max_id_str;
                this.handleTweets(response.json.statuses);
            });
        };

        this.searchPollingId = setInterval(pollFunc, this.config.pollInterval);
        pollFunc();
    }

    handleTweets(tweets)
    {
        tweets
            // get original tweet
            .map(t => t.retweeted_status ? t.retweeted_status : t)
            // remove duplicates and already handled tweets
            .filter(t => this.handled[t.id_str] ? false : this.handled[t.id_str] = true)
            // compute creation dates
            .map(t => {
                t.created_milisec_ago = (new Date()).getTime() - (new Date(t.created_at)).getTime();
                t.created_days_ago =  t.created_milisec_ago / 86400 / 1000;
                return t;
            })
            // check requirements
            .filter(t => (
                t.user.followers_count >= this.config.requirements.user.followers
                && t.retweet_count >= this.config.requirements.retweets
                && (
                    this.config.requirements.newerThan === undefined
                    || t.created_days_ago <= this.config.requirements.newerThan
                )
                && (
                    this.config.requirements.olderThan === undefined
                    || t.created_days_ago >= this.config.requirements.olderThan
                )
            ))
            // actions
            .map(tweet => {
                this.client.show(tweet.id_str)
                    .then(response => response.json)
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

}
