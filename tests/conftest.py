"""
Configuração global para testes pytest

Define fixtures e configurações compartilhadas entre todos os testes.
"""

import pytest
import sys
from pathlib import Path

# Adiciona src ao path para importações
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

@pytest.fixture
def sample_qa_item():
    """Fixture com item de Q&A para testes"""
    from src.models.qa import QAItem
    
    return QAItem(
        pergunta="Como fazer matrícula?",
        resposta="Para fazer matrícula, acesse o SIGAA...",
        variacoes=["Como me matricular?", "Processo de matrícula"],
        tags=["matricula", "sigaa", "semestre"],
        categoria="matricula"
    )

@pytest.fixture
def sample_user():
    """Fixture com usuário para testes"""
    from src.models.user import User
    
    return User(
        user_id=123456,
        username="test_user",
        first_name="Test",
        last_name="User"
    )

@pytest.fixture
def sample_ppc_chunk():
    """Fixture com chunk do PPC para testes"""
    from src.models.qa import PPCChunk
    
    return PPCChunk(
        id="chunk_1",
        text="O estágio curricular supervisionado é obrigatório...",
        keywords=["estágio", "supervisionado", "obrigatório"],
        section="estágio",
        word_count=50
    )
