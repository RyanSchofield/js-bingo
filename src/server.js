import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server);

const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

const candidates = [
	"[,,,].length",
	"true + false",
	"[1, 2, 3] + [4, 5, 6]",
	"0.2 + 0.1 === 0.3",
	"10,2",
	'!!""',
	"+!![]",
	"parseInt(0.0000005)",
	'true == "true"',
	"010 - 03",
	'"" - - ""',
	"null + 0",
	"0/0",
	"1/0 > 10 ** 1000",
	"true++",
	'"" - 1',
	'(null - 0) + "0"',
	'true + ("true" - 0)',
	'!5 + !5',
	'[] + []',
	'1 + 2 + "3"',
	'typeof NaN',
	'undefined + false',
	'"" && -0',
	'+!!NaN * "" - - [,]',
//	'[,] + [,]',
//	'[] + [] === [,] + [,]',
	'[,,,] + [,,,]',
//	'([,,,] + [,,,]).length === [,,,,].length',
	'1 + 1',
	'2 + 2',
	'1 + "1"',
	'undefined >= 0 || undefined < 0',
	`(function(){
    		return typeof arguments;
  	})()`,
	`(function(x){
    		delete x;
    		return x;
  	})(1)`,
	'typeof null',
	'typeof undefined',
	'typeof []',
	`(function f(f){
		return typeof f();
	})(function(){ return 1; })`,
	'1/0',
	'typeof (1/0)',
	`(function f(){
		function f(){ return 1; }
		return f();
		function f(){ return 2; }
	})()`,
	'with (function(x, undefined){}) length',
	'1 == true',
	'[1] == true',
	'[] == true',
	'[1,2] == true',
	'1 === true',
	'1 == "1"',
	'1 === "1"',
	'[] == ![]',
	'true == [] || true == ![]',
	'false == [] && false == ![]',
	'"b" + "a" + +"a" + "a"',
	'true == "1"',
	'!!"false" == !!"true"',
	'NaN === NaN',
	'["hello", "world"].join(" ")',
	'Object.is(-0, 0)',
	'![] + []',
	'[] + {}',
	'null == false',
	'[0] == 0',
	"[0] == ''",
	"[''] == 0",
	'[] == 0',
	'[[[[[[ null ]]]]]] == 0',
	'Number()',
	'Number(undefined)',
	'parseInt(0.0000001)',
	'3 > 2 > 1',
	"'3' - 1",
	'[4] * [4]',
	'[] * []',
	'[4, 4] * [4, 4]',
	'"str" instanceof String',
	'[...[..."..."]].length',
	`(() => {
		try {
			return 2;
		} finally {
			return 3;
		}
	})()`,
	'(() => {})()',
	'NaN != NaN',
	// '(() => ({}))()',
	'Math.min() > Math.max()',
	'Math.min()',
	'null >= 0',
	'null == 0',
	'[10, 1, 3].sort()',
	'{}{}',
	"{foo: 'bar'}{}",
	"{}{foo: 'bar'}",
	"27..toString()",
	'"".split("")',
	'"".split(" ")',
	'[[1, 2], [3, 4], [5]].flat()',
	'[...[1,2,3], ...[4,5,6]]',
	'0 * Infinity',
	'null * true',
	'true * 0x10',
	'[...new Set([1, 2, 2, 3, 3, 3])]',
	'[1, 2, 3, 4, 5].filter(x => x % 2)',
	'[1, 2, 3].reduce((acc, val) => acc + val, 0)',
	'[10, 1, 3].toSorted((a,b) => a - b)',
	'[1, 2, 3, 4].pop()',
	'10**1000',
	"(() => 'foo')`bar`",
//	"((_, a, b) => a + b)`${'foo'} + ${'bar'} = ?`"
]

let unseen = [];
let seen = [];
const possibleValues = new Set;
let current = null;

const shuffleArray = (arr) => {
	let vals = [...arr]

	vals = vals.map(value => ({ value, sort: Math.random() }))
		.sort((a, b) => a.sort - b.sort)
		.map(({ value }) => value)

	return vals
}

const formatValue = (val) => {
	// return JSON.stringify(val);
	if (typeof val == 'string') {
		val = '"' + val + '"'
	} else if (Array.isArray(val)) {
		const formatted = val.map(formatValue)
		val = '[' + String(formatted) + ']'
	} else {
		val = String(val)
	}

	return val
}

const initializeGame = () => {
	unseen = [];
	possibleValues.clear();
	seen = [];
	current = null;

	
	console.log('initializeGame')
	let shuffledCandidates = shuffleArray(candidates);
	
	let i = 0;
	for (let candidate of shuffledCandidates) {
		if (i > 50) break;

		let value = null;
		
		try {
			value = eval(candidate)
		} catch (e) {
			continue
		}
		
		value = formatValue(value)
		if (possibleValues.has(value)) continue;

		possibleValues.add(value)
		unseen.push({expression: candidate, value})
		i++
	}
	console.log('these many vals', possibleValues.size);
	io.emit('startGame')
}

// we want to create a map of values as shown
// to list of expressions generating them.


const getBoard = () => {
	const shuffledValues = shuffleArray(possibleValues)
	const newBoard = []

	let i = 0
	while (i < 25) {
		if (i == 12) {
			newBoard.push('FREE')
		} else {
			newBoard.push(shuffledValues.pop())
		}

		i++
	}


	return newBoard
};

io.on('getBoard', (socket) => {
	socket.emit('setBoard', getBoard())
	console.log('test getBoard')
});

io.on('connection', (socket) => {
	socket.on('getBoard', () => socket.emit('setBoard', getBoard()))
	socket.on('newGame', () => initializeGame())

	const sendExp = () => {
		const next = unseen.pop()
		if (next) {
			io.emit('newExpression', next.expression, next.value);
			current = next;
		}
	}

	if (current) {
		socket.emit('newExpression', current.expression, current.value)
	}
	
	socket.on('getExpression', sendExp)
});


initializeGame();
server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});
