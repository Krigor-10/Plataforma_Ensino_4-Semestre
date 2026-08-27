using BCrypt.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.Data;
using PlataformaEnsino.API.DTOs;
using PlataformaEnsino.API.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace PlataformaEnsino.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AlunosController : ControllerBase
    {
        private readonly PlataformaContext _context;

        public AlunosController(PlataformaContext context)
        {
            _context = context;
        }

        // GET: api/Alunos
        [HttpGet]
        [Authorize(Roles = "Admin,Coordenador")]
        public async Task<ActionResult<IEnumerable<Aluno>>> GetAlunos()
        {
            return await _context.Alunos.ToListAsync();
        }

        // POST: api/Alunos
        [HttpPost]
        [Authorize(Roles = "Admin,Coordenador")]
        public async Task<ActionResult<AlunoResponseDto>> PostAluno([FromBody] CriarAlunoDto dto)
        {
            var emailNormalizado = dto.Email.Trim().ToLower();
            var cpfNormalizado = new string(dto.Cpf.Where(char.IsDigit).ToArray());

            if (await _context.Usuarios.AnyAsync(usuario => usuario.Email.ToLower() == emailNormalizado))
            {
                return BadRequest(new { erro = "Ja existe um usuario com este e-mail." });
            }

            if (await _context.Usuarios.AnyAsync(usuario => usuario.Cpf == cpfNormalizado))
            {
                return BadRequest(new { erro = "Ja existe um usuario com este CPF." });
            }

            var aluno = new Aluno
            {
                Nome = dto.Nome.Trim(),
                Email = emailNormalizado,
                Cpf = cpfNormalizado,
                Telefone = dto.Telefone.Trim(),
                Cep = dto.Cep.Trim(),
                Rua = dto.Rua.Trim(),
                Numero = dto.Numero.Trim(),
                Bairro = dto.Bairro.Trim(),
                Cidade = dto.Cidade.Trim(),
                Estado = dto.Estado.Trim().ToUpper(),
                Matricula = await GerarCodigoAlunoAsync()
            };
            aluno.ConfigurarAcesso("Aluno", BCrypt.Net.BCrypt.HashPassword(dto.Senha), dto.Ativo);

            _context.Alunos.Add(aluno);
            await _context.SaveChangesAsync();

            return Ok(MapResponse(aluno));
        }

        // POST: api/Alunos/cadastro-completo
        [HttpPost("cadastro-completo")]
        public async Task<IActionResult> CadastroCompleto([FromBody] CadastroAlunoDto dto)
        {
            try
            {
                var emailNormalizado = dto.Email.Trim().ToLower();
                var cpfNormalizado = new string(dto.Cpf.Where(char.IsDigit).ToArray());

                if (await _context.Usuarios.AnyAsync(u => u.Email.ToLower() == emailNormalizado))
                {
                    return BadRequest(new { erro = "Ja existe um usuario com este e-mail." });
                }

                if (await _context.Usuarios.AnyAsync(u => u.Cpf == cpfNormalizado))
                {
                    return BadRequest(new { erro = "Ja existe um usuario com este CPF." });
                }

                if (!await _context.Cursos.AnyAsync(c => c.Id == dto.CursoId))
                {
                    return BadRequest(new { erro = "Curso informado nao foi encontrado." });
                }

                await using var transaction = await _context.Database.BeginTransactionAsync();

                var aluno = new Aluno
                {
                    Nome = dto.Nome.Trim(),
                    Email = emailNormalizado,
                    Cpf = cpfNormalizado,
                    Telefone = dto.Telefone.Trim(),
                    Cep = dto.Cep.Trim(),
                    Rua = dto.Rua.Trim(),
                    Numero = dto.Numero.Trim(),
                    Bairro = dto.Bairro.Trim(),
                    Cidade = dto.Cidade.Trim(),
                    Estado = dto.Estado.Trim().ToUpper(),
                    Matricula = await GerarCodigoAlunoAsync()
                };
                aluno.ConfigurarAcesso("Aluno", BCrypt.Net.BCrypt.HashPassword(dto.Senha));

                _context.Alunos.Add(aluno);
                await _context.SaveChangesAsync();

                var matricula = new Matricula
                {
                    AlunoId = aluno.Id,
                    CursoId = dto.CursoId,
                    CodigoRegistro = await GerarCodigoMatriculaAsync()
                };
                matricula.RegistrarSolicitacao(DateTime.UtcNow);

                _context.Matriculas.Add(matricula);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new
                {
                    mensagem = "Cadastro realizado com sucesso. Solicitação pendente de aprovação."
                });
            }
            catch (Exception)
            {
                return BadRequest(new
                {
                    erro = "Nao foi possivel concluir o cadastro."
                });
            }
        }

        private async Task<string> GerarCodigoMatriculaAsync()
        {
            for (var tentativa = 0; tentativa < 10; tentativa++)
            {
                var codigo = CodigoRegistroGenerator.GerarMatricula();

                if (!await _context.Matriculas.AnyAsync(matricula => matricula.CodigoRegistro == codigo))
                {
                    return codigo;
                }
            }

            throw new InvalidOperationException("Nao foi possivel gerar um codigo de registro unico para a matricula.");
        }

        private async Task<string> GerarCodigoAlunoAsync()
        {
            for (var tentativa = 0; tentativa < 10; tentativa++)
            {
                var codigo = CodigoRegistroGenerator.GerarAluno();

                if (!await _context.Alunos.AnyAsync(aluno => aluno.Matricula == codigo))
                {
                    return codigo;
                }
            }

            throw new InvalidOperationException("Nao foi possivel gerar um codigo de registro unico para o aluno.");
        }

        [Authorize]
        [HttpGet("teste-jwt")]
        public IActionResult TesteJwt()
        {
            return Ok(new
            {
                mensagem = "Token válido. Usuário autenticado com sucesso."
            });
        }

        private static AlunoResponseDto MapResponse(Aluno aluno)
        {
            return new AlunoResponseDto
            {
                Id = aluno.Id,
                Nome = aluno.Nome,
                Email = aluno.Email,
                Cpf = aluno.Cpf,
                Telefone = aluno.Telefone,
                Cep = aluno.Cep,
                Rua = aluno.Rua,
                Numero = aluno.Numero,
                Bairro = aluno.Bairro,
                Cidade = aluno.Cidade,
                Estado = aluno.Estado,
                TipoUsuario = aluno.TipoUsuario,
                DataCadastro = aluno.DataCadastro,
                Ativo = aluno.Ativo,
                Matricula = aluno.Matricula,
                TurmaAtual = aluno.TurmaAtual
            };
        }
    }
}
