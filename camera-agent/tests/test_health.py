from unittest.mock import patch, MagicMock
from health import HealthReporter

def test_health_reporter():
    reporter = HealthReporter(interval_seconds=1)
    
    with patch('requests.post') as mock_post:
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_post.return_value = mock_response
        
        reporter.start()
        assert reporter.running == True
        
        reporter.stop()
        assert reporter.running == False
