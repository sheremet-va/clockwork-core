export default (moment): void => {
    const formats = {
        LLY: {
            en: 'MMMM D',
            ru: 'D MMMM'
        },
        LLLT: {
            en: 'MMMM D, LT',
            ru: 'D MMMM с LT'
        }
    };

    Object.keys(formats.LLY)
        .forEach(key => {
            moment.updateLocale(key, {
                longDateFormat: {
                    '[LL-Y]': formats.LLY[key],
                    '[LLLT]': formats.LLLT[key]
                }
            });
        });
};