extends Node
## Client API (autoload "Api"). Legge VillageData da GET /api/village (stesse sessione/cookie del sito).
## Nell'editor usa dati finti; nel build Web chiama il backend reale.

signal village_loaded(data: Dictionary)
signal request_failed(message: String)

var mock := not OS.has_feature("web")
var base_url := ""   # vuoto = stesso dominio del sito (build Web)

func _ready() -> void:
	# Godot Web non accetta URL relativi: prendo il dominio della pagina (es. https://sito.vercel.app)
	if not mock and base_url == "":
		base_url = str(JavaScriptBridge.eval("window.location.origin"))

func fetch_village() -> void:
	if mock:
		await get_tree().process_frame
		village_loaded.emit(_mock_data())
		return
	var req := HTTPRequest.new()
	req.accept_gzip = false   # il browser decomprime già da solo: evita il doppio gunzip (errore stream_peer_gzip)
	add_child(req)
	req.request_completed.connect(func(result, code, _h, body):
		req.queue_free()
		if result != HTTPRequest.RESULT_SUCCESS:
			request_failed.emit("Non riesco a contattare il villaggio.")
		elif code == 401:
			request_failed.emit("Sessione scaduta: accedi di nuovo.")
		elif code != 200:
			request_failed.emit("Errore del server (%d)." % code)
		else:
			var parsed = JSON.parse_string(body.get_string_from_utf8())
			if parsed is Dictionary and parsed.has("hotspots"):
				village_loaded.emit(parsed)
			else:
				request_failed.emit("Risposta non valida."))
	var err := req.request(base_url + "/api/village", ["Accept: application/json"])
	if err != OK:
		req.queue_free()
		request_failed.emit("Non riesco a contattare il villaggio (errore %d)." % err)

func _mock_data() -> Dictionary:
	var zs := [
		["piazza-centrale", "Piazza Centrale", 50, 55], ["ufficio-postale", "Ufficio Postale", 20, 38],
		["pasticceria", "Pasticceria", 82, 76], ["negozio-giocattoli", "Negozio dei Giocattoli", 20, 80],
		["laboratorio-babbo-natale", "Laboratorio di Babbo Natale", 72, 34], ["lago-ghiacciato", "Lago Ghiacciato", 50, 86]]
	var hs_seed := [
		["piazza-centrale", "Sotto il grande albero", "tree", 50, 45.91], ["piazza-centrale", "Fontana ghiacciata", "fountain", 37.5, 60],
		["piazza-centrale", "Panchina innevata", "bench", 55, 65.45], ["piazza-centrale", "Lampione decorato", "lamp", 66.25, 62.73],
		["ufficio-postale", "Cassetta delle lettere", "mailbox", 8.13, 40.91], ["ufficio-postale", "Sportello postale", "post-counter", 20.63, 33.64],
		["ufficio-postale", "Archivio delle lettere", "archive", 30, 40.91], ["ufficio-postale", "Slitta parcheggiata", "sled", 35, 47.27],
		["pasticceria", "Forno", "oven", 70, 80.91], ["pasticceria", "Vetrina dei dolci", "pastry-window", 81.25, 73.64],
		["pasticceria", "Tavolino esterno", "cafe-table", 91.25, 80.91], ["pasticceria", "Dispensa", "pantry", 95.63, 89.09],
		["negozio-giocattoli", "Trenino", "toy-train", 30, 87.27], ["negozio-giocattoli", "Vetrina principale", "toy-window", 18.75, 74.55],
		["negozio-giocattoli", "Scaffale dei giocattoli", "toy-shelf", 8.13, 82.73], ["negozio-giocattoli", "Cavallo a dondolo", "rocking-horse", 4.38, 91.82],
		["laboratorio-babbo-natale", "Banco da lavoro", "workbench", 63.75, 39.09], ["laboratorio-babbo-natale", "Camino", "fireplace", 77.5, 30.91],
		["laboratorio-babbo-natale", "Macchina dei giocattoli", "toy-machine", 86.88, 40], ["laboratorio-babbo-natale", "Magazzino", "warehouse", 70.63, 46.36],
		["lago-ghiacciato", "Ponte", "bridge", 43.75, 78], ["lago-ghiacciato", "Chalet", "chalet", 61.25, 84.73],
		["lago-ghiacciato", "Slitta sul lago", "lake-sled", 53.75, 92], ["lago-ghiacciato", "Lanterna sulla riva", "shore-lantern", 35.94, 84.09]]
	var zones := []
	for z in zs:
		zones.append({"slug": z[0], "name": z[1], "positionX": z[2], "positionY": z[3]})
	var hs := []
	for i in hs_seed.size():
		var h: Array = hs_seed[i]
		var st := "locked"
		if i < 3: st = "completed"
		elif i == 9: st = "available"
		elif i < 9: st = "discovered"
		hs.append({"id": str(i), "slug": "luogo-%d" % i, "zoneSlug": h[0], "name": h[1], "kind": h[2], "x": h[3], "y": h[4],
			"dayNumber": null if st == "locked" else i + 1, "state": st,
			"hint": "Qui trovi la sorpresa del giorno %d." % (i + 1),
			"lockedHint": "Ancora chiuso: torna più avanti!", "sortOrder": i})
	return {"zones": zones, "hotspots": hs, "phase": "in-corso", "starLit": false}
