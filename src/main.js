import App from './app.js';
import Config from './config.js';

let optionsContainer = window.document.querySelector('#init-data');
if (optionsContainer) {
    let options = JSON.parse(optionsContainer.value);
    if (!!options.loggedIn
        && Config.accounts.indexOf(options.screenName) > -1
    ) {
        console.warn('CONTEST SEEKER BOT START');
        new App(Config, options);
    }
}
