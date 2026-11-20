export function formatUsd(cents: number): string {
	const sign = cents < 0 ? "-" : "";
	const abs = Math.abs(Math.trunc(cents));
	const dollars = Math.floor(abs / 100);
	const rem = abs % 100;
	const grouped = dollars.toLocaleString("en-US");
	return `${sign}$${grouped}.${rem.toString().padStart(2, "0")}`;
}
