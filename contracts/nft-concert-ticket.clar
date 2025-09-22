 
(define-non-fungible-token concert-ticket uint)

(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-MAX-TICKETS u101)
(define-constant ERR-INVALID-PRICE u102)
(define-constant ERR-INVALID-EVENT-DATE u103)
(define-constant ERR-INVALID-ROYALTY-RATE u104)
(define-constant ERR-INVALID-RESALE-THRESHOLD u105)
(define-constant ERR-EVENT-ALREADY-EXISTS u106)
(define-constant ERR-EVENT-NOT-FOUND u107)
(define-constant ERR-INVALID-TIMESTAMP u108)
(define-constant ERR-AUTHORITY-NOT-VERIFIED u109)
(define-constant ERR-INVALID-MIN-PRICE u110)
(define-constant ERR-INVALID-MAX-RESALE u111)
(define-constant ERR-EVENT-UPDATE-NOT-ALLOWED u112)
(define-constant ERR-INVALID-UPDATE-PARAM u113)
(define-constant ERR-MAX-EVENTS-EXCEEDED u114)
(define-constant ERR-INVALID-EVENT-TYPE u115)
(define-constant ERR-INVALID-VENUE-CAPACITY u116)
(define-constant ERR-INVALID-GRACE-PERIOD u117)
(define-constant ERR-INVALID-LOCATION u118)
(define-constant ERR-INVALID-CURRENCY u119)
(define-constant ERR-INVALID-STATUS u120)
(define-constant ERR-TICKET-ALREADY-MINTED u121)
(define-constant ERR-TICKET-NOT-OWNED u122)
(define-constant ERR-TRANSFER-NOT-ALLOWED u123)
(define-constant ERR-ROYALTY-NOT-PAID u124)
(define-constant ERR-INVALID-TIER u125)

(define-data-var next-event-id uint u0)
(define-data-var max-events uint u1000)
(define-data-var mint-fee uint u1000)
(define-data-var authority-contract (optional principal) none)

(define-map events
  uint
  {
    name: (string-utf8 100),
    max-tickets: uint,
    price: uint,
    event-date: uint,
    royalty-rate: uint,
    resale-threshold: uint,
    timestamp: uint,
    organizer: principal,
    event-type: (string-utf8 50),
    venue-capacity: uint,
    grace-period: uint,
    location: (string-utf8 100),
    currency: (string-utf8 20),
    status: bool,
    min-price: uint,
    max-resale: uint
  }
)

(define-map events-by-name
  (string-utf8 100)
  uint)

(define-map event-updates
  uint
  {
    update-name: (string-utf8 100),
    update-max-tickets: uint,
    update-price: uint,
    update-timestamp: uint,
    updater: principal
  }
)

(define-map ticket-details
  { ticket-id: uint, event-id: uint }
  {
    owner: principal,
    tier: (string-utf8 20),
    is-valid: bool,
    resale-count: uint
  }
)

(define-data-var next-ticket-id uint u0)

(define-read-only (get-event (id uint))
  (map-get? events id)
)

(define-read-only (get-event-updates (id uint))
  (map-get? event-updates id)
)

(define-read-only (is-event-registered (name (string-utf8 100)))
  (is-some (map-get? events-by-name name))
)

(define-read-only (get-ticket-details (ticket-id uint) (event-id uint))
  (map-get? ticket-details { ticket-id: ticket-id, event-id: event-id })
)

(define-private (validate-name (name (string-utf8 100)))
  (if (and (> (len name) u0) (<= (len name) u100))
      (ok true)
      (err ERR-INVALID-UPDATE-PARAM))
)

(define-private (validate-max-tickets (tickets uint))
  (if (and (> tickets u0) (<= tickets u10000))
      (ok true)
      (err ERR-INVALID-MAX-TICKETS))
)

(define-private (validate-price (price uint))
  (if (> price u0)
      (ok true)
      (err ERR-INVALID-PRICE))
)

(define-private (validate-event-date (date uint))
  (if (> date block-height)
      (ok true)
      (err ERR-INVALID-EVENT-DATE))
)

(define-private (validate-royalty-rate (rate uint))
  (if (<= rate u10)
      (ok true)
      (err ERR-INVALID-ROYALTY-RATE))
)

(define-private (validate-resale-threshold (threshold uint))
  (if (<= threshold u5)
      (ok true)
      (err ERR-INVALID-RESALE-THRESHOLD))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-event-type (type (string-utf8 50)))
  (if (or (is-eq type "concert") (is-eq type "festival") (is-eq type "theater"))
      (ok true)
      (err ERR-INVALID-EVENT-TYPE))
)

(define-private (validate-venue-capacity (capacity uint))
  (if (> capacity u0)
      (ok true)
      (err ERR-INVALID-VENUE-CAPACITY))
)

(define-private (validate-grace-period (period uint))
  (if (<= period u7)
      (ok true)
      (err ERR-INVALID-GRACE-PERIOD))
)

(define-private (validate-location (loc (string-utf8 100)))
  (if (and (> (len loc) u0) (<= (len loc) u100))
      (ok true)
      (err ERR-INVALID-LOCATION))
)

(define-private (validate-currency (cur (string-utf8 20)))
  (if (or (is-eq cur "STX") (is-eq cur "USD") (is-eq cur "BTC"))
      (ok true)
      (err ERR-INVALID-CURRENCY))
)

(define-private (validate-min-price (min uint))
  (if (> min u0)
      (ok true)
      (err ERR-INVALID-MIN-PRICE))
)

(define-private (validate-max-resale (max uint))
  (if (> max u0)
      (ok true)
      (err ERR-INVALID-MAX-RESALE))
)

(define-private (validate-principal (p principal))
  (if (not (is-eq p 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-NOT-AUTHORIZED))
)

(define-private (validate-tier (tier (string-utf8 20)))
  (if (or (is-eq tier "VIP") (is-eq tier "General") (is-eq tier "Premium"))
      (ok true)
      (err ERR-INVALID-TIER))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-events (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-MAX-EVENTS-EXCEEDED))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set max-events new-max)
    (ok true)
  )
)

(define-public (set-mint-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set mint-fee new-fee)
    (ok true)
  )
)

(define-public (create-event
  (event-name (string-utf8 100))
  (max-tickets uint)
  (price uint)
  (event-date uint)
  (royalty-rate uint)
  (resale-threshold uint)
  (event-type (string-utf8 50))
  (venue-capacity uint)
  (grace-period uint)
  (location (string-utf8 100))
  (currency (string-utf8 20))
  (min-price uint)
  (max-resale uint)
)
  (let (
        (next-id (var-get next-event-id))
        (current-max (var-get max-events))
        (authority (var-get authority-contract))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-EVENTS-EXCEEDED))
    (try! (validate-name event-name))
    (try! (validate-max-tickets max-tickets))
    (try! (validate-price price))
    (try! (validate-event-date event-date))
    (try! (validate-royalty-rate royalty-rate))
    (try! (validate-resale-threshold resale-threshold))
    (try! (validate-event-type event-type))
    (try! (validate-venue-capacity venue-capacity))
    (try! (validate-grace-period grace-period))
    (try! (validate-location location))
    (try! (validate-currency currency))
    (try! (validate-min-price min-price))
    (try! (validate-max-resale max-resale))
    (asserts! (is-none (map-get? events-by-name event-name)) (err ERR-EVENT-ALREADY-EXISTS))
    (let ((authority-recipient (unwrap! authority (err ERR-AUTHORITY-NOT-VERIFIED))))
      (try! (stx-transfer? (var-get mint-fee) tx-sender authority-recipient))
    )
    (map-set events next-id
      {
        name: event-name,
        max-tickets: max-tickets,
        price: price,
        event-date: event-date,
        royalty-rate: royalty-rate,
        resale-threshold: resale-threshold,
        timestamp: block-height,
        organizer: tx-sender,
        event-type: event-type,
        venue-capacity: venue-capacity,
        grace-period: grace-period,
        location: location,
        currency: currency,
        status: true,
        min-price: min-price,
        max-resale: max-resale
      }
    )
    (map-set events-by-name event-name next-id)
    (var-set next-event-id (+ next-id u1))
    (print { event: "event-created", id: next-id })
    (ok next-id)
  )
)

(define-public (update-event
  (event-id uint)
  (update-name (string-utf8 100))
  (update-max-tickets uint)
  (update-price uint)
)
  (let ((event (map-get? events event-id)))
    (match event
      e
        (begin
          (asserts! (is-eq (get organizer e) tx-sender) (err ERR-NOT-AUTHORIZED))
          (try! (validate-name update-name))
          (try! (validate-max-tickets update-max-tickets))
          (try! (validate-price update-price))
          (let ((existing (map-get? events-by-name update-name)))
            (match existing
              existing-id
                (asserts! (is-eq existing-id event-id) (err ERR-EVENT-ALREADY-EXISTS))
              (begin true)
            )
          )
          (let ((old-name (get name e)))
            (if (is-eq old-name update-name)
                (ok true)
                (begin
                  (map-delete events-by-name old-name)
                  (map-set events-by-name update-name event-id)
                  (ok true)
                )
            )
          )
          (map-set events event-id
            {
              name: update-name,
              max-tickets: update-max-tickets,
              price: update-price,
              event-date: (get event-date e),
              royalty-rate: (get royalty-rate e),
              resale-threshold: (get resale-threshold e),
              timestamp: block-height,
              organizer: (get organizer e),
              event-type: (get event-type e),
              venue-capacity: (get venue-capacity e),
              grace-period: (get grace-period e),
              location: (get location e),
              currency: (get currency e),
              status: (get status e),
              min-price: (get min-price e),
              max-resale: (get max-resale e)
            }
          )
          (map-set event-updates event-id
            {
              update-name: update-name,
              update-max-tickets: update-max-tickets,
              update-price: update-price,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "event-updated", id: event-id })
          (ok true)
        )
      (err ERR-EVENT-NOT-FOUND)
    )
  )
)

(define-public (mint-ticket (event-id uint) (tier (string-utf8 20)))
  (let ((event (unwrap! (map-get? events event-id) (err ERR-EVENT-NOT-FOUND)))
        (next-id (var-get next-ticket-id)))
    (asserts! (is-eq (get organizer event) tx-sender) (err ERR-NOT-AUTHORIZED))
    (asserts! (< next-id (get max-tickets event)) (err ERR-INVALID-MAX-TICKETS))
    (try! (validate-tier tier))
    (try! (nft-mint? concert-ticket next-id tx-sender))
    (map-set ticket-details { ticket-id: next-id, event-id: event-id }
      {
        owner: tx-sender,
        tier: tier,
        is-valid: true,
        resale-count: u0
      }
    )
    (var-set next-ticket-id (+ next-id u1))
    (print { event: "ticket-minted", ticket-id: next-id, event-id: event-id })
    (ok next-id)
  )
)

(define-public (transfer-ticket (ticket-id uint) (event-id uint) (recipient principal) (resale-price uint))
  (let ((ticket (unwrap! (map-get? ticket-details { ticket-id: ticket-id, event-id: event-id }) (err ERR-EVENT-NOT-FOUND)))
        (event (unwrap! (map-get? events event-id) (err ERR-EVENT-NOT-FOUND))))
    (asserts! (is-eq (get owner ticket) tx-sender) (err ERR-TICKET-NOT-OWNED))
    (asserts! (get is-valid ticket) (err ERR-INVALID-STATUS))
    (asserts! (< (get resale-count ticket) (get resale-threshold event)) (err ERR-TRANSFER-NOT-ALLOWED))
    (asserts! (>= resale-price (get min-price event)) (err ERR-INVALID-MIN-PRICE))
    (asserts! (<= resale-price (get max-resale event)) (err ERR-INVALID-MAX-RESALE))
    (let ((royalty-amount (/ (* resale-price (get royalty-rate event)) u100)))
      (try! (stx-transfer? royalty-amount tx-sender (get organizer event)))
      (try! (stx-transfer? (- resale-price royalty-amount) tx-sender recipient))
    )
    (try! (nft-transfer? concert-ticket ticket-id tx-sender recipient))
    (map-set ticket-details { ticket-id: ticket-id, event-id: event-id }
      (merge ticket { owner: recipient, resale-count: (+ (get resale-count ticket) u1) })
    )
    (print { event: "ticket-transferred", ticket-id: ticket-id, event-id: event-id, new-owner: recipient })
    (ok true)
  )
)

(define-public (verify-ticket (ticket-id uint) (event-id uint))
  (let ((ticket (map-get? ticket-details { ticket-id: ticket-id, event-id: event-id })))
    (match ticket
      t (ok { owner: (get owner t), is-valid: (get is-valid t), tier: (get tier t) })
      (err ERR-EVENT-NOT-FOUND)
    )
  )
)

(define-public (invalidate-ticket (ticket-id uint) (event-id uint))
  (let ((ticket (unwrap! (map-get? ticket-details { ticket-id: ticket-id, event-id: event-id }) (err ERR-EVENT-NOT-FOUND)))
        (event (unwrap! (map-get? events event-id) (err ERR-EVENT-NOT-FOUND))))
    (asserts! (is-eq (get organizer event) tx-sender) (err ERR-NOT-AUTHORIZED))
    (map-set ticket-details { ticket-id: ticket-id, event-id: event-id }
      (merge ticket { is-valid: false })
    )
    (print { event: "ticket-invalidated", ticket-id: ticket-id, event-id: event-id })
    (ok true)
  )
)

(define-public (get-event-count)
  (ok (var-get next-event-id))
)

(define-public (check-event-existence (name (string-utf8 100)))
  (ok (is-event-registered name))
)