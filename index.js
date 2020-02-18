const validateOptions = require('schema-utils');
const recursive = require("recursive-readdir");
const fs = require('fs');
const md5 = require('md5');

class NgTemplatesCache {

    constructor(options) {

        const schema = {
            "type": "object",
            "properties": {
                "angularApp": {
                    "type": "string"
                },
                "filename": {
                    "type": "string"
                },
                "templateDirectory": {
                    "type": "string"
                },
            },
            "additionalProperties": false
        }

        validateOptions(schema, options, {
            name: 'NgTemplatesCache',
            baseDataPath: 'options',
        });

        this.options = options;
    }

    apply(compiler) {
        compiler.hooks.emit.tapAsync('NgTemplatesCache', (compilation, callback) => {
            recursive(this.options.templateDirectory).then((files) => {
                let templates = [];
                files.forEach((i) => {
                    if (i.indexOf('.html') > 0) {
                        const templateSource = fs.readFileSync(i, 'utf8')
                            .replace(/[\\']/g, '\\$&')
                            .replace(/\u0000/g, '\\0')
                            .split("\r").join('')
                            .split("\n").join('');
                        i = i.replace('app/', '/');
                        templates.push(`$templateCache.put('${i}', '${templateSource}');`)
                    }
                });
                return Promise.resolve(templates);
            }).then((templates) => {
                const fileSource = `angular.module('${this.options.angularApp}').run(["$templateCache", function($templateCache) {${templates.join("\r\n")}}]);`;
                const filename = this.options.filename
                    .split('[hash]').join(md5(fileSource))
                compilation.assets[filename] = {
                    source: () => fileSource,
                    size: () => fileSource.length,
                };
                callback();
            });
        });
    }
}

module.exports = NgTemplatesCache;
