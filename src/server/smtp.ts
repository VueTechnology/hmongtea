import { connect } from "node:net";

export function sendSmtp(input: {
	host: string;
	port: number;
	from: string;
	to: string;
	subject: string;
	body: string;
}): Promise<void> {
	const from = bareAddress(input.from);
	const to = bareAddress(input.to);
	const subject = input.subject.replace(/[\r\n]/g, " ");
	const body = input.body.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
	const commands = [
		"EHLO localhost",
		`MAIL FROM:<${from}>`,
		`RCPT TO:<${to}>`,
		"DATA",
	];
	return new Promise((resolve, reject) => {
		const socket = connect({ host: input.host, port: input.port });
		let buffer = "";
		let stage = 0;
		const fail = (error: Error) => {
			socket.destroy();
			reject(error);
		};
		const advance = () => {
			const command = commands[stage];
			if (command) {
				stage += 1;
				socket.write(`${command}\r\n`);
				return;
			}
			if (stage === commands.length) {
				stage += 1;
				socket.write(
					`From: ${from}\r\nTo: ${to}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}\r\n.\r\n`,
				);
				return;
			}
			if (stage === commands.length + 1) {
				stage += 1;
				socket.write("QUIT\r\n");
				return;
			}
			socket.end();
			resolve();
		};
		socket.on("data", (chunk) => {
			buffer += chunk.toString("utf8");
			let split = buffer.indexOf("\n");
			while (split >= 0) {
				const line = buffer.slice(0, split).replace(/\r$/, "");
				buffer = buffer.slice(split + 1);
				const code = Number(line.slice(0, 3));
				const continued = line[3] === "-";
				if (!continued) {
					if (!Number.isInteger(code) || code >= 400) {
						fail(new Error("SMTP refused the message"));
						return;
					}
					advance();
				}
				split = buffer.indexOf("\n");
			}
		});
		socket.on("error", fail);
		socket.setTimeout(8000, () => fail(new Error("SMTP timed out")));
	});
}

function bareAddress(value: string): string {
	const trimmed = value.trim();
	if (/[\r\n<>]/.test(trimmed) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
		throw new Error("SMTP address is not a mailbox");
	}
	return trimmed;
}
