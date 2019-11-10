module.exports = core => {
    const send = () => true;
    const get = () => true;
    const set = () => true;

    return { send, get, set };
};