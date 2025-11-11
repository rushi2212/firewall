import geoip2.database
import socket

def get_geoip(ip_address):
    """
    Returns GeoIP location data using MaxMind GeoLite2.
    If no database or invalid IP, returns default.
    """
    try:
        if ip_address == "127.0.0.1" or ip_address.lower() == "localhost":
            hostname = socket.gethostname()
            ip_address = socket.gethostbyname(hostname)

        reader = geoip2.database.Reader("./GeoLite2-City.mmdb")
        response = reader.city(ip_address)

        geo_data = {
            "ip": ip_address,
            "country": response.country.name,
            "city": response.city.name,
            "latitude": response.location.latitude,
            "longitude": response.location.longitude
        }
        reader.close()
        return geo_data

    except Exception as e:
        return {
            "ip": ip_address,
            "country": "Unknown",
            "city": "Unknown",
            "latitude": None,
            "longitude": None,
            "error": str(e)
        }
