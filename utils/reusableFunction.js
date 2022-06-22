const generateShortId = (id) => {
    return (parseInt(id.slice(0, 8) + id.slice(-1), 16)).toString(36)
}

module.exports = {
    generateShortId
}