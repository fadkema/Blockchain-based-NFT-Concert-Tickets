 
import { describe, it, expect, beforeEach } from "vitest";
import { stringUtf8CV, uintCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_MAX_TICKETS = 101;
const ERR_INVALID_PRICE = 102;
const ERR_INVALID_EVENT_DATE = 103;
const ERR_INVALID_ROYALTY_RATE = 104;
const ERR_INVALID_RESALE_THRESHOLD = 105;
const ERR_EVENT_ALREADY_EXISTS = 106;
const ERR_EVENT_NOT_FOUND = 107;
const ERR_INVALID_EVENT_TYPE = 115;
const ERR_INVALID_VENUE_CAPACITY = 116;
const ERR_INVALID_GRACE_PERIOD = 117;
const ERR_INVALID_LOCATION = 118;
const ERR_INVALID_CURRENCY = 119;
const ERR_INVALID_MIN_PRICE = 110;
const ERR_INVALID_MAX_RESALE = 111;
const ERR_MAX_EVENTS_EXCEEDED = 114;
const ERR_INVALID_UPDATE_PARAM = 113;
const ERR_AUTHORITY_NOT_VERIFIED = 109;
const ERR_INVALID_TIER = 125;
const ERR_TICKET_NOT_OWNED = 122;
const ERR_TRANSFER_NOT_ALLOWED = 123;

interface Event {
	name: string;
	maxTickets: number;
	price: number;
	eventDate: number;
	royaltyRate: number;
	resaleThreshold: number;
	timestamp: number;
	organizer: string;
	eventType: string;
	venueCapacity: number;
	gracePeriod: number;
	location: string;
	currency: string;
	status: boolean;
	minPrice: number;
	maxResale: number;
}

interface EventUpdate {
	updateName: string;
	updateMaxTickets: number;
	updatePrice: number;
	updateTimestamp: number;
	updater: string;
}

interface Ticket {
	owner: string;
	tier: string;
	isValid: boolean;
	resaleCount: number;
}

interface Result<T> {
	ok: boolean;
	value: T;
}

class EventTicketMock {
	state: {
		nextEventId: number;
		maxEvents: number;
		mintFee: number;
		authorityContract: string | null;
		events: Map<number, Event>;
		eventUpdates: Map<number, EventUpdate>;
		eventsByName: Map<string, number>;
		nextTicketId: number;
		tickets: Map<string, Ticket>;
	} = {
		nextEventId: 0,
		maxEvents: 1000,
		mintFee: 1000,
		authorityContract: null,
		events: new Map(),
		eventUpdates: new Map(),
		eventsByName: new Map(),
		nextTicketId: 0,
		tickets: new Map(),
	};
	blockHeight: number = 0;
	caller: string = "ST1TEST";
	authorities: Set<string> = new Set(["ST1TEST"]);
	stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

	constructor() {
		this.reset();
	}

	reset() {
		this.state = {
			nextEventId: 0,
			maxEvents: 1000,
			mintFee: 1000,
			authorityContract: null,
			events: new Map(),
			eventUpdates: new Map(),
			eventsByName: new Map(),
			nextTicketId: 0,
			tickets: new Map(),
		};
		this.blockHeight = 0;
		this.caller = "ST1TEST";
		this.authorities = new Set(["ST1TEST"]);
		this.stxTransfers = [];
	}

	setAuthorityContract(contractPrincipal: string): Result<boolean> {
		if (contractPrincipal === "SP000000000000000000002Q6VF78") {
			return { ok: false, value: false };
		}
		if (this.state.authorityContract !== null) {
			return { ok: false, value: false };
		}
		this.state.authorityContract = contractPrincipal;
		return { ok: true, value: true };
	}

	setMintFee(newFee: number): Result<boolean> {
		if (!this.state.authorityContract) return { ok: false, value: false };
		this.state.mintFee = newFee;
		return { ok: true, value: true };
	}

	createEvent(
		name: string,
		maxTickets: number,
		price: number,
		eventDate: number,
		royaltyRate: number,
		resaleThreshold: number,
		eventType: string,
		venueCapacity: number,
		gracePeriod: number,
		location: string,
		currency: string,
		minPrice: number,
		maxResale: number
	): Result<number> {
		if (this.state.nextEventId >= this.state.maxEvents)
			return { ok: false, value: ERR_MAX_EVENTS_EXCEEDED };
		if (!name || name.length > 100)
			return { ok: false, value: ERR_INVALID_UPDATE_PARAM };
		if (maxTickets <= 0 || maxTickets > 10000)
			return { ok: false, value: ERR_INVALID_MAX_TICKETS };
		if (price <= 0) return { ok: false, value: ERR_INVALID_PRICE };
		if (eventDate <= this.blockHeight)
			return { ok: false, value: ERR_INVALID_EVENT_DATE };
		if (royaltyRate > 10) return { ok: false, value: ERR_INVALID_ROYALTY_RATE };
		if (resaleThreshold > 5)
			return { ok: false, value: ERR_INVALID_RESALE_THRESHOLD };
		if (!["concert", "festival", "theater"].includes(eventType))
			return { ok: false, value: ERR_INVALID_EVENT_TYPE };
		if (venueCapacity <= 0)
			return { ok: false, value: ERR_INVALID_VENUE_CAPACITY };
		if (gracePeriod > 7) return { ok: false, value: ERR_INVALID_GRACE_PERIOD };
		if (!location || location.length > 100)
			return { ok: false, value: ERR_INVALID_LOCATION };
		if (!["STX", "USD", "BTC"].includes(currency))
			return { ok: false, value: ERR_INVALID_CURRENCY };
		if (minPrice <= 0) return { ok: false, value: ERR_INVALID_MIN_PRICE };
		if (maxResale <= 0) return { ok: false, value: ERR_INVALID_MAX_RESALE };
		if (this.state.eventsByName.has(name))
			return { ok: false, value: ERR_EVENT_ALREADY_EXISTS };
		if (!this.state.authorityContract)
			return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };

		this.stxTransfers.push({
			amount: this.state.mintFee,
			from: this.caller,
			to: this.state.authorityContract,
		});

		const id = this.state.nextEventId;
		const event: Event = {
			name,
			maxTickets,
			price,
			eventDate,
			royaltyRate,
			resaleThreshold,
			timestamp: this.blockHeight,
			organizer: this.caller,
			eventType,
			venueCapacity,
			gracePeriod,
			location,
			currency,
			status: true,
			minPrice,
			maxResale,
		};
		this.state.events.set(id, event);
		this.state.eventsByName.set(name, id);
		this.state.nextEventId++;
		return { ok: true, value: id };
	}

	getEvent(id: number): Event | null {
		return this.state.events.get(id) || null;
	}

	updateEvent(
		id: number,
		updateName: string,
		updateMaxTickets: number,
		updatePrice: number
	): Result<boolean> {
		const event = this.state.events.get(id);
		if (!event) return { ok: false, value: false };
		if (event.organizer !== this.caller) return { ok: false, value: false };
		if (!updateName || updateName.length > 100)
			return { ok: false, value: false };
		if (updateMaxTickets <= 0 || updateMaxTickets > 10000)
			return { ok: false, value: false };
		if (updatePrice <= 0) return { ok: false, value: false };
		if (
			this.state.eventsByName.has(updateName) &&
			this.state.eventsByName.get(updateName) !== id
		) {
			return { ok: false, value: false };
		}

		const updated: Event = {
			...event,
			name: updateName,
			maxTickets: updateMaxTickets,
			price: updatePrice,
			timestamp: this.blockHeight,
		};
		this.state.events.set(id, updated);
		this.state.eventsByName.delete(event.name);
		this.state.eventsByName.set(updateName, id);
		this.state.eventUpdates.set(id, {
			updateName,
			updateMaxTickets,
			updatePrice,
			updateTimestamp: this.blockHeight,
			updater: this.caller,
		});
		return { ok: true, value: true };
	}

	mintTicket(eventId: number, tier: string): Result<number> {
		const event = this.state.events.get(eventId);
		if (!event) return { ok: false, value: ERR_EVENT_NOT_FOUND };
		if (event.organizer !== this.caller)
			return { ok: false, value: ERR_NOT_AUTHORIZED };
		if (this.state.nextTicketId >= event.maxTickets)
			return { ok: false, value: ERR_INVALID_MAX_TICKETS };
		if (!["VIP", "General", "Premium"].includes(tier))
			return { ok: false, value: ERR_INVALID_TIER };

		const ticketId = this.state.nextTicketId;
		const key = `${ticketId}-${eventId}`;
		this.state.tickets.set(key, {
			owner: this.caller,
			tier,
			isValid: true,
			resaleCount: 0,
		});
		this.state.nextTicketId++;
		return { ok: true, value: ticketId };
	}

	transferTicket(
		ticketId: number,
		eventId: number,
		recipient: string,
		resalePrice: number
	): Result<boolean> {
		const key = `${ticketId}-${eventId}`;
		const ticket = this.state.tickets.get(key);
		if (!ticket) return { ok: false, value: false };
		const event = this.state.events.get(eventId);
		if (!event) return { ok: false, value: false };
		if (ticket.owner !== this.caller)
			return { ok: false, value: ERR_TICKET_NOT_OWNED };
		if (!ticket.isValid) return { ok: false, value: false };
		if (ticket.resaleCount >= event.resaleThreshold)
			return { ok: false, value: ERR_TRANSFER_NOT_ALLOWED };
		if (resalePrice < event.minPrice) return { ok: false, value: false };
		if (resalePrice > event.maxResale) return { ok: false, value: false };

		const royaltyAmount = Math.floor((resalePrice * event.royaltyRate) / 100);
		this.stxTransfers.push({
			amount: royaltyAmount,
			from: this.caller,
			to: event.organizer,
		});
		this.stxTransfers.push({
			amount: resalePrice - royaltyAmount,
			from: this.caller,
			to: recipient,
		});

		this.state.tickets.set(key, {
			...ticket,
			owner: recipient,
			resaleCount: ticket.resaleCount + 1,
		});
		return { ok: true, value: true };
	}

	getEventCount(): Result<number> {
		return { ok: true, value: this.state.nextEventId };
	}

	checkEventExistence(name: string): Result<boolean> {
		return { ok: true, value: this.state.eventsByName.has(name) };
	}
}

describe("EventTicketMock", () => {
	let contract: EventTicketMock;

	beforeEach(() => {
		contract = new EventTicketMock();
		contract.reset();
	});

	it("creates an event successfully", () => {
		contract.setAuthorityContract("ST2TEST");
		const result = contract.createEvent(
			"ConcertA",
			100,
			50,
			1000,
			5,
			3,
			"concert",
			500,
			2,
			"ArenaX",
			"STX",
			40,
			100
		);
		expect(result.ok).toBe(true);
		expect(result.value).toBe(0);

		const event = contract.getEvent(0);
		expect(event?.name).toBe("ConcertA");
		expect(event?.maxTickets).toBe(100);
		expect(event?.price).toBe(50);
		expect(contract.stxTransfers).toEqual([
			{ amount: 1000, from: "ST1TEST", to: "ST2TEST" },
		]);
	});

	it("rejects duplicate event names", () => {
		contract.setAuthorityContract("ST2TEST");
		contract.createEvent(
			"ConcertA",
			100,
			50,
			1000,
			5,
			3,
			"concert",
			500,
			2,
			"ArenaX",
			"STX",
			40,
			100
		);
		const result = contract.createEvent(
			"ConcertA",
			200,
			100,
			2000,
			10,
			5,
			"festival",
			1000,
			4,
			"ParkY",
			"USD",
			80,
			200
		);
		expect(result.ok).toBe(false);
		expect(result.value).toBe(ERR_EVENT_ALREADY_EXISTS);
	});

	it("rejects event creation without authority contract", () => {
		const result = contract.createEvent(
			"NoAuth",
			100,
			50,
			1000,
			5,
			3,
			"concert",
			500,
			2,
			"ArenaX",
			"STX",
			40,
			100
		);
		expect(result.ok).toBe(false);
		expect(result.value).toBe(ERR_AUTHORITY_NOT_VERIFIED);
	});

	it("rejects invalid max tickets", () => {
		contract.setAuthorityContract("ST2TEST");
		const result = contract.createEvent(
			"InvalidTickets",
			10001,
			50,
			1000,
			5,
			3,
			"concert",
			500,
			2,
			"ArenaX",
			"STX",
			40,
			100
		);
		expect(result.ok).toBe(false);
		expect(result.value).toBe(ERR_INVALID_MAX_TICKETS);
	});

	it("updates an event successfully", () => {
		contract.setAuthorityContract("ST2TEST");
		contract.createEvent(
			"OldEvent",
			100,
			50,
			1000,
			5,
			3,
			"concert",
			500,
			2,
			"ArenaX",
			"STX",
			40,
			100
		);
		const result = contract.updateEvent(0, "NewEvent", 150, 75);
		expect(result.ok).toBe(true);
		expect(result.value).toBe(true);
		const event = contract.getEvent(0);
		expect(event?.name).toBe("NewEvent");
		expect(event?.maxTickets).toBe(150);
		expect(event?.price).toBe(75);
	});

	it("rejects update for non-existent event", () => {
		contract.setAuthorityContract("ST2TEST");
		const result = contract.updateEvent(99, "NewEvent", 150, 75);
		expect(result.ok).toBe(false);
		expect(result.value).toBe(false);
	});

	it("rejects update by non-organizer", () => {
		contract.setAuthorityContract("ST2TEST");
		contract.createEvent(
			"TestEvent",
			100,
			50,
			1000,
			5,
			3,
			"concert",
			500,
			2,
			"ArenaX",
			"STX",
			40,
			100
		);
		contract.caller = "ST3FAKE";
		const result = contract.updateEvent(0, "NewEvent", 150, 75);
		expect(result.ok).toBe(false);
		expect(result.value).toBe(false);
	});

	it("sets mint fee successfully", () => {
		contract.setAuthorityContract("ST2TEST");
		const result = contract.setMintFee(2000);
		expect(result.ok).toBe(true);
		expect(result.value).toBe(true);
		expect(contract.state.mintFee).toBe(2000);
	});

	it("returns correct event count", () => {
		contract.setAuthorityContract("ST2TEST");
		contract.createEvent(
			"Event1",
			100,
			50,
			1000,
			5,
			3,
			"concert",
			500,
			2,
			"ArenaX",
			"STX",
			40,
			100
		);
		contract.createEvent(
			"Event2",
			200,
			100,
			2000,
			10,
			5,
			"festival",
			1000,
			4,
			"ParkY",
			"USD",
			80,
			200
		);
		const result = contract.getEventCount();
		expect(result.ok).toBe(true);
		expect(result.value).toBe(2);
	});

	it("checks event existence correctly", () => {
		contract.setAuthorityContract("ST2TEST");
		contract.createEvent(
			"TestEvent",
			100,
			50,
			1000,
			5,
			3,
			"concert",
			500,
			2,
			"ArenaX",
			"STX",
			40,
			100
		);
		const result = contract.checkEventExistence("TestEvent");
		expect(result.ok).toBe(true);
		expect(result.value).toBe(true);
		const result2 = contract.checkEventExistence("NonExistent");
		expect(result2.ok).toBe(true);
		expect(result2.value).toBe(false);
	});

	it("mints a ticket successfully", () => {
		contract.setAuthorityContract("ST2TEST");
		contract.createEvent(
			"ConcertA",
			100,
			50,
			1000,
			5,
			3,
			"concert",
			500,
			2,
			"ArenaX",
			"STX",
			40,
			100
		);
		const result = contract.mintTicket(0, "VIP");
		expect(result.ok).toBe(true);
		expect(result.value).toBe(0);
	});

	it("transfers a ticket successfully", () => {
		contract.setAuthorityContract("ST2TEST");
		contract.createEvent(
			"ConcertA",
			100,
			50,
			1000,
			5,
			3,
			"concert",
			500,
			2,
			"ArenaX",
			"STX",
			40,
			100
		);
		contract.mintTicket(0, "VIP");
		const result = contract.transferTicket(0, 0, "ST4RECIP", 60);
		expect(result.ok).toBe(true);
		expect(result.value).toBe(true);
		expect(contract.stxTransfers).toEqual([
			{ amount: 1000, from: "ST1TEST", to: "ST2TEST" },
			{ amount: 3, from: "ST1TEST", to: "ST1TEST" },
			{ amount: 57, from: "ST1TEST", to: "ST4RECIP" },
		]);
	});

	it("rejects transfer if not owner", () => {
		contract.setAuthorityContract("ST2TEST");
		contract.createEvent(
			"ConcertA",
			100,
			50,
			1000,
			5,
			3,
			"concert",
			500,
			2,
			"ArenaX",
			"STX",
			40,
			100
		);
		contract.mintTicket(0, "VIP");
		contract.caller = "ST3FAKE";
		const result = contract.transferTicket(0, 0, "ST4RECIP", 60);
		expect(result.ok).toBe(false);
		expect(result.value).toBe(ERR_TICKET_NOT_OWNED);
	});

	it("rejects transfer exceeding resale threshold", () => {
		contract.setAuthorityContract("ST2TEST");
		contract.createEvent(
			"ConcertA",
			100,
			50,
			1000,
			5,
			1,
			"concert",
			500,
			2,
			"ArenaX",
			"STX",
			40,
			100
		);
		contract.mintTicket(0, "VIP");
		contract.transferTicket(0, 0, "ST4RECIP", 60);
		contract.caller = "ST4RECIP";
		const result = contract.transferTicket(0, 0, "ST5RECIP", 70);
		expect(result.ok).toBe(false);
		expect(result.value).toBe(ERR_TRANSFER_NOT_ALLOWED);
	});

	it("parses event parameters with Clarity types", () => {
		const name = stringUtf8CV("TestEvent");
		const maxTickets = uintCV(100);
		const price = uintCV(50);
		expect(name.value).toBe("TestEvent");
		expect(maxTickets.value).toEqual(BigInt(100));
		expect(price.value).toEqual(BigInt(50));
	});
});