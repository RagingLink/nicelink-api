const express = require('express');
const router = express.Router();
const {
    evaluate
} = require('mathjs')
router.post('/', (req, res, next) => {
    var scope = {},
        expression;
    if (!req.body || !req.body.expression) return res.send({
        error: 'Invalid request',
        message: 'No provided body, you want to evaluate air?'
    });
    expression = req.body.expression;
    delete req.body.expression;
    scope = req.body.scope || {}
    delete req.body.scope;
    scope = Object.assign(scope, req.body);
    let output = evaluate(expression, scope);
    if (output.mathjs && output.mathjs === 'Complex') {
        output = output.re + output.im;
    };
    return res.send(JSON.stringify({
        output,
        scope
    }));
});

module.exports = router;