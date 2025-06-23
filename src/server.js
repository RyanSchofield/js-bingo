import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import fs from 'fs'; 

const app = express();
const server = createServer(app);
const io = new Server(server);

const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

let candidates = null;
candidates = fs.readFileSync('expressions.txt').toString().split("\n"); 

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
