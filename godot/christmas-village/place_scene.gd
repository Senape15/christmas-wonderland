extends Control
const NpcData := preload("res://npcs.gd")
const NicoScript := preload("res://nico.gd")
const PortraitScript := preload("res://npc_portrait.gd")
const BgScript := preload("res://place_bg.gd")
## Scena di un luogo: sfondo a tutto schermo, Nico a sinistra, il personaggio del posto a destra
## e un dialogo a battute. In fondo: "Apri la sorpresa" (emette `finished`) o "Torna al villaggio" (`closed`).
## Gli sfondi si aggiungono in res://backgrounds/<kind>.png (es. oven.png) oppure zone_<quartiere>.png.

signal finished(day: int)
signal closed

var day := 0
var lines: Array = []
var idx := 0
var npc_name := ""
var npc_role := ""
var tw: Tween
var bg_tex: TextureRect
var bg_fallback
var nico
var npc
var title_lbl: Label
var box: PanelContainer
var name_lbl: Label
var role_lbl: Label
var text_lbl: Label
var btn_next: Button
var btn_open: Button
var btn_back: Button
var btn_close: Button
var ui_k := 1.0

## Stessa logica di main.gd: su telefono i controlli in pixel vanno ingranditi.
func ui_scale() -> float:
	var v := Vector2(1280, 720)
	if OS.has_feature("web"):
		var w := float(JavaScriptBridge.eval("window.innerWidth"))
		var h := float(JavaScriptBridge.eval("window.innerHeight"))
		if w > 0.0 and h > 0.0:
			v = Vector2(w, h)
	else:
		v = get_viewport().size
	if v.x <= 0.0 or v.y <= 0.0:
		return 1.0
	var s := minf(v.x / 1280.0, v.y / 720.0)
	if s <= 0.0:
		return 1.0
	return clampf(1.0 / s, 1.0, 3.2)

func _ready() -> void:
	ui_k = ui_scale()
	mouse_filter = Control.MOUSE_FILTER_STOP
	bg_fallback = BgScript.new()
	bg_fallback.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	bg_fallback.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bg_fallback)
	bg_tex = TextureRect.new()
	bg_tex.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	bg_tex.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	bg_tex.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	bg_tex.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bg_tex.visible = false
	add_child(bg_tex)
	var shade := ColorRect.new()
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.color = Color(0, 0, 0.05, 0.18)
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(shade)

	nico = NicoScript.new()
	nico.render_scale = 2.1 * ui_k
	nico.custom_minimum_size = Vector2(128 * 2.1 * ui_k, 172 * 2.1 * ui_k)
	nico.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(nico)
	npc = PortraitScript.new()
	npc.scale = Vector2(ui_k, ui_k)
	add_child(npc)

	title_lbl = Label.new()
	title_lbl.position = Vector2(28, 20)
	title_lbl.add_theme_font_size_override("font_size", int(round(34 * ui_k)))
	title_lbl.add_theme_color_override("font_color", Color("ffe9a8"))
	title_lbl.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.8))
	title_lbl.add_theme_constant_override("outline_size", 8)
	add_child(title_lbl)

	btn_close = Button.new()
	btn_close.text = "Esci"
	btn_close.pressed.connect(_close)
	add_child(btn_close)
	btn_close.anchor_left = 1.0
	btn_close.anchor_right = 1.0
	btn_close.offset_left = -20.0
	btn_close.offset_right = -20.0
	btn_close.offset_top = 20.0
	btn_close.offset_bottom = 20.0
	btn_close.grow_horizontal = Control.GROW_DIRECTION_BEGIN

	box = PanelContainer.new()
	box.custom_minimum_size = Vector2(0, 190 * ui_k)
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color("0f3b25")
	sb.border_color = Color("e6b84a")
	sb.set_border_width_all(4)
	sb.set_corner_radius_all(22)
	sb.set_content_margin_all(22)
	sb.shadow_color = Color(0, 0, 0, 0.4)
	sb.shadow_size = 10
	box.add_theme_stylebox_override("panel", sb)
	box.gui_input.connect(_on_box_input)
	add_child(box)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 8)
	box.add_child(v)
	var hb := HBoxContainer.new()
	hb.add_theme_constant_override("separation", 12)
	v.add_child(hb)
	name_lbl = Label.new()
	name_lbl.add_theme_font_size_override("font_size", int(round(26 * ui_k)))
	name_lbl.add_theme_color_override("font_color", Color("ffd966"))
	role_lbl = Label.new()
	role_lbl.add_theme_font_size_override("font_size", int(round(16 * ui_k)))
	role_lbl.add_theme_color_override("font_color", Color("b8d6c4"))
	role_lbl.size_flags_vertical = Control.SIZE_SHRINK_END
	hb.add_child(name_lbl)
	hb.add_child(role_lbl)
	text_lbl = Label.new()
	text_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	text_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	text_lbl.size_flags_vertical = Control.SIZE_EXPAND_FILL
	text_lbl.add_theme_font_size_override("font_size", int(round(24 * ui_k)))
	text_lbl.add_theme_color_override("font_color", Color("f1f7f2"))
	v.add_child(text_lbl)
	var br := HBoxContainer.new()
	br.alignment = BoxContainer.ALIGNMENT_END
	br.add_theme_constant_override("separation", 10)
	v.add_child(br)
	btn_back = Button.new()
	btn_back.text = "Torna al villaggio"
	btn_back.pressed.connect(_close)
	btn_open = Button.new()
	btn_open.text = "Apri la sorpresa"
	btn_open.pressed.connect(_open_surprise)
	btn_next = Button.new()
	btn_next.text = "Avanti"
	btn_next.pressed.connect(_next)
	br.add_child(btn_back)
	br.add_child(btn_open)
	br.add_child(btn_next)
	resized.connect(_layout)
	visible = false

func _layout() -> void:
	ui_k = ui_scale()
	nico.render_scale = 2.1 * ui_k
	nico.custom_minimum_size = Vector2(128 * 2.1 * ui_k, 172 * 2.1 * ui_k)
	npc.scale = Vector2(ui_k, ui_k)
	title_lbl.add_theme_font_size_override("font_size", int(round(34 * ui_k)))
	name_lbl.add_theme_font_size_override("font_size", int(round(26 * ui_k)))
	role_lbl.add_theme_font_size_override("font_size", int(round(16 * ui_k)))
	text_lbl.add_theme_font_size_override("font_size", int(round(24 * ui_k)))
	var s := size
	var bh := 190.0 * ui_k
	var by := s.y - bh - 28.0 * ui_k
	box.position = Vector2(s.x * 0.06, by)
	box.size = Vector2(s.x * 0.88, bh)
	nico.position = Vector2(s.x * 0.07, by - (361.0 - 70.0) * ui_k)
	npc.position = Vector2(s.x * 0.93 - 280.0 * ui_k, by - (380.0 - 70.0) * ui_k)

func open(d: Dictionary, zone: String, db_dialogues: Dictionary = {}) -> void:
	var kind := str(d.get("kind", ""))
	var info: Dictionary = NpcData.get_npc(kind, zone)
	var dn = d.get("dayNumber")
	day = int(dn) if dn != null else 0
	title_lbl.text = str(d.get("name", "Luogo"))
	npc_name = str(info["name"])
	npc_role = str(info["role"])
	npc.look = info["look"]
	lines = []
	# Le frasi configurate nell'admin tramite quiz hanno la precedenza:
	# chiavi = kind del luogo, valore = array [[npc|nico, testo], ...].
	var custom = db_dialogues.get(kind, [])
	if custom is Array and not custom.is_empty():
		for l in custom:
			if l is Array and l.size() >= 2:
				lines.append([str(l[0]), str(l[1])])
	else:
		for l in info["lines"]:
			lines.append(l)
	var hint := str(d.get("hint", ""))
	if hint != "":
		lines.append(["nico", hint])
	_load_bg(kind, zone)
	bg_fallback.zone = zone
	bg_fallback.kind = kind
	idx = 0
	visible = true
	modulate.a = 0.0
	create_tween().tween_property(self, "modulate:a", 1.0, 0.35)
	_layout()
	_show_line()

func _load_bg(kind: String, zone: String) -> void:
	bg_tex.visible = false
	bg_fallback.visible = true
	for base in ["res://backgrounds/%s" % kind, "res://backgrounds/zone_%s" % zone]:
		for ext in ["png", "jpg", "jpeg", "webp"]:
			var p: String = "%s.%s" % [base, ext]
			if ResourceLoader.exists(p):
				var tex = load(p)
				if tex is Texture2D:
					bg_tex.texture = tex
					bg_tex.visible = true
					bg_fallback.visible = false
					return

func _show_line() -> void:
	var ln: Array = lines[idx]
	var is_nico := str(ln[0]) == "nico"
	var text := str(ln[1])
	name_lbl.text = "Nico" if is_nico else npc_name
	role_lbl.text = "L'elfo guida" if is_nico else npc_role
	text_lbl.text = text
	nico.talking = is_nico
	npc.talking = not is_nico
	nico.modulate = Color.WHITE if is_nico else Color(0.6, 0.6, 0.7)
	npc.modulate = Color(0.6, 0.6, 0.7) if is_nico else Color.WHITE
	if is_nico:
		nico.wave(1.2)
	text_lbl.visible_ratio = 0.0
	if tw != null and tw.is_valid():
		tw.kill()
	tw = create_tween()
	tw.tween_property(text_lbl, "visible_ratio", 1.0, clampf(text.length() * 0.025, 0.6, 3.0))
	tw.tween_callback(_line_done)
	var last := idx >= lines.size() - 1
	btn_next.visible = not last
	btn_open.visible = last and day > 0
	btn_back.visible = last

func _line_done() -> void:
	nico.talking = false
	npc.talking = false

func _next() -> void:
	if text_lbl.visible_ratio < 1.0:
		if tw != null and tw.is_valid():
			tw.kill()
		text_lbl.visible_ratio = 1.0
		_line_done()
		return
	if idx < lines.size() - 1:
		idx += 1
		_show_line()

func _on_box_input(e: InputEvent) -> void:
	if e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
		if idx < lines.size() - 1 or text_lbl.visible_ratio < 1.0:
			_next()

func _input(e: InputEvent) -> void:
	if not visible:
		return
	if e is InputEventKey and e.pressed and not e.echo:
		if e.keycode == KEY_ESCAPE:
			_close()
			get_viewport().set_input_as_handled()
		elif e.keycode == KEY_SPACE or e.keycode == KEY_ENTER or e.keycode == KEY_KP_ENTER:
			if idx < lines.size() - 1 or text_lbl.visible_ratio < 1.0:
				_next()
			get_viewport().set_input_as_handled()

func _close() -> void:
	visible = false
	closed.emit()

func _open_surprise() -> void:
	visible = false
	finished.emit(day)
