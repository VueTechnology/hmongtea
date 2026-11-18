export function MailText({ body }: { body: string }) {
	const parts = body.split(/(https?:\/\/[^\s]+)/g);
	const nodes = [];
	let cursor = 0;
	for (const part of parts) {
		const key = `mail-${cursor}`;
		cursor += part.length + 1;
		if (part.startsWith("http")) {
			nodes.push(
				<a key={key} href={part}>
					{part}
				</a>,
			);
		} else if (part.length > 0) {
			nodes.push(<span key={key}>{part}</span>);
		}
	}
	return <p className="m-0 whitespace-pre-wrap text-sm">{nodes}</p>;
}
