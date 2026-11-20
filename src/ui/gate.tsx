import { Link } from "@tanstack/react-router";
import { Page, quietButtonClass, Title } from "#/ui/site";

export function Forbidden() {
	return (
		<Page>
			<Title eyebrow="hmongtea.com" title="This page is closed" />
			<p data-testid="forbidden">This account cannot open that page.</p>
			<Link to="/" className={quietButtonClass}>
				Home
			</Link>
		</Page>
	);
}

export function Missing() {
	return (
		<Page>
			<Title eyebrow="hmongtea.com" title="That page is not here" />
			<p>The address does not match a page on hmongtea.com.</p>
			<Link to="/" className={quietButtonClass}>
				Home
			</Link>
		</Page>
	);
}
