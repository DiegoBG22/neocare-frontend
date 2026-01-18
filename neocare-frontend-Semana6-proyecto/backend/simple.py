# test_simple.py
import requests
import json

def test():
    print("🧪 Probando login con JSON...")
    
    url = "http://localhost:8000/api/auth/login"
    
    # Datos en JSON
    data = {
        "email": "usuario_prueba_1@test.com",
        "password": "usuario1"
    }
    
    try:
        response = requests.post(url, json=data, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ ¡ÉXITO! Login funciona con JSON")
            print(f"Token: {result['access_token'][:50]}...")
            
            # Ahora prueba los reportes
            test_reportes(result['access_token'])
            
        elif response.status_code == 422:
            print("❌ Error 422: El endpoint aún no acepta JSON")
            print("💡 Verifica que cambiaste auth_router.py correctamente")
            print("💡 Línea 30-32 debe ser: user_data: UserLogin")
            
        else:
            print(f"❌ Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def test_reportes(token):
    print("\n📊 Probando reportes con el token...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Primero obtener tableros
    boards_url = "http://localhost:8000/api/boards/"
    response = requests.get(boards_url, headers=headers, timeout=10)
    
    if response.status_code == 200:
        boards = response.json()
        if boards:
            board_id = boards[0]['id']
            print(f"✅ Tablero encontrado: {boards[0]['title']} (ID: {board_id})")
            
            # Probar reportes
            report_url = f"http://localhost:8000/report/debug/{board_id}"
            report_response = requests.get(report_url, headers=headers, timeout=10)
            
            if report_response.status_code == 200:
                report_data = report_response.json()
                print(f"✅ Reportes funcionando!")
                print(f"   Listas: {len(report_data.get('lists', []))}")
                print(f"   Tarjetas: {report_data.get('total_cards', 0)}")
            else:
                print(f"❌ Error en reportes: {report_response.text}")
        else:
            print("⚠️  No hay tableros. Crea uno desde tu frontend.")
    else:
        print(f"❌ Error obteniendo tableros: {response.text}")

if __name__ == "__main__":
    test()