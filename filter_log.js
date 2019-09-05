const fs = require('fs');
const r = /INFO \- \d+ \- (.*) \- (Executing|Executed): (.*)/;
const splitter= /(.*?),(\d+).* - INFO \- \d+ - (.*?) - .*/;
const file = fs.readFileSync('/Users/samccone/Downloads/logs_git.txt', 'utf-8');

const lines = file.split('\n').filter(v => r.test(v));
const map = new Map();

const threads = new Set();

for (const line of lines) {
    m = splitter.exec(line);
    if (m == null) {
        console.log('BAD', line)
        return;
    } else {
        threads.add(m[3])
    }
}

const ret = [];
for (const thread of threads) {
    let lastCommand;
    for (const line of lines) {
        const m = splitter.exec(line);
        if (thread === m[3]) {
            const ts = new Date(m[1])
            ts.setMilliseconds(Number(m[2]));
            const commandMatch = r.exec(line);
            if (lastCommand == null) {
                if (commandMatch == null) {
                    console.log(line);
                    throw new Error('bad line', line)
                }
                lastCommand = {
                    ts: ts.getTime(),
                    command: commandMatch[3],
                }
            } else {
                ret.push({
                    start: lastCommand.ts,
                    end: ts.getTime(),
                    rowId: thread,
                    label: lastCommand.command
                })
                lastCommand = undefined;
            }
        }

    }
}
console.log(JSON.stringify(ret));


/*
        const command = m[3] + " " + m[4]
        const k =  command + '_' + thread;

        if (map.has(k)) {
            arr = map.get(k);
            arr.push({
                thread,
                command,
                ts
            });
            arr = arr.sort((a, b) => a.ts - b.ts);
            map.set(k, arr); 
        } else {
            map.set(k, [{
                thread, command, ts
            }]);
        }
    }
}

const pairs =  Array.from(map.values()).filter(v => v.length === 2);
const ret = [];

for (const p of pairs) {
    ret.push({
        start: p[0].ts,
        end: p[1].ts,
        rowId: p[0].thread,
        label: p[0].command
    });
}

console.log(JSON.stringify(ret));

*/