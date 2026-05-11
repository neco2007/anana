# -*- mode: python ; coding: utf-8 -*-
import importlib.util, os

_eel_js = os.path.join(os.path.dirname(importlib.util.find_spec('eel').origin), 'eel.js')

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[
        (_eel_js, 'eel'),
        ('frontend/out', 'frontend/out'),
        ('satohuru_masta.csv', 'seed'),
        ('sincho.csv', 'seed'),
    ],
    hiddenimports=['bottle_websocket'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['torch', 'torchvision', 'scipy', 'matplotlib', 'wandb', 'PIL', 'pygame'],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='OrderONE',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=True,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='OrderONE',
)

app = BUNDLE(
    coll,
    name='OrderONE.app',
    icon=None,
    bundle_identifier='com.orderone.app',
    argv_emulation=True,
    info_plist={
        'NSHighResolutionCapable': True,
        'LSBackgroundOnly': False,
    },
)
