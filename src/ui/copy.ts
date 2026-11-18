export const errors: Record<string, string> = {
	email: "Enter a valid email.",
	password: "Use 12 or more characters for the password.",
	name: "Enter a name.",
	phone: "Enter a phone number with at least 7 digits.",
	taken: "That email is already registered.",
	credentials: "The email or password is wrong.",
	csrf: "The form expired. Reload the page and try again.",
	ein: "Enter a 9-digit EIN.",
	business:
		"Enter the legal name, business address, phone, and contact person.",
	website:
		"Enter a website starting with http:// or https://, or leave it blank.",
	address: "Enter the street, city, region, and postal code.",
	qty: "Enter a whole quantity.",
	stock: "There are not enough packs on hand for that quantity.",
	moq: "Partner orders start at 12 packs.",
	pending: "This partner application is waiting for staff approval.",
	empty: "Your cart is empty.",
	payment:
		"Checkout is paused. The payment keys on this server are not a matching test pair.",
	shipped: "This order has already shipped.",
	closed: "That order cannot be changed.",
	tracking: "Enter a ship date and a tracking number.",
	subject: "Enter a subject and a message.",
	amount:
		"Enter the target and the amount raised in whole dollars. The target has to be at least 1.",
	unsubscribed: "This email is unsubscribed.",
	status: "Choose a status.",
	missing: "That record is not on file.",
	retail: "Partner accounts order from the partner desk.",
};

export const savedText = "Saved.";
export const cancelledText = "The order is cancelled.";
export const shippedText = "The order is marked shipped.";
export const deletedText = "Deleted.";
