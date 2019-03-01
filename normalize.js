const normalize = function (topic) {
    if (typeof topic !== 'string') return undefined;

    return topic
        .split('/')
        .map(name => name
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[ _]/g, "-")
            .replace(/[^a-z0-9-]/g, "")
        )
        .join('/');
};

module.exports = normalize;
