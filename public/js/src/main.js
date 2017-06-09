import searchComponent from './components/search.js';

function main(){
    alert('foot');
    searchComponent()
        .init()
        .render(document.querySelector('.search'));
}

main();
