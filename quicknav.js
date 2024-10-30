function handleKeyPress(event) {
    switch (event.key) {
        case '1':
            // Redirect to levels page
            window.location.href = './level.html';
            break;
        case '2':
            // Redirect to infinite generation page
            window.location.href = './infinity.html';
            break;
        default:
            break; // Do nothing for other keys
    }
}

// Add event listener for keypress
document.addEventListener('keydown', handleKeyPress);