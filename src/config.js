export default {
    accounts: ['contest_seeker'],
    contest: {
        search: 'rt follow gagner',
        pollInterval: 10000,
        requirements: {
            followers: 1000,
            retweets: 50,
            newerThan: 15, // days
        },
    },
    api: {
        baseUrl: 'https://api.twitter.com/1.1/',
        pauseDurationOnError: 600000,
    },
    bots: [
        // contest
        {
            search: {
                q: 'rt follow gagner',
                count: 100,
                lang: 'fr'
            },
            pollInterval: 10000,
            requirements: {
                user: {
                    followers: 5000,
                },
                retweets: 100,
                newerThan: 15, // days
            },
            actions: {
                copy: {
                    removeMentions: true,
                },
                favorite: true,
                retweet: true,
                follow: {
                    user: true,
                    mentionned: true,
                },
                reply: 'Regarde ça @dwogsi'
            }
        }
    ]
}
