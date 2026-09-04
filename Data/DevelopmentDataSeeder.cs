using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using PlataformaEnsino.API.Common;
using PlataformaEnsino.API.Models;

namespace PlataformaEnsino.API.Data;

public static class DevelopmentDataSeeder
{
    private const string AdminEmail = "admin@edtech.local";
    private const string CoordinatorEmail = "coordenacao@edtech.local";
    private const string ProfessorEmail = "professor@edtech.local";
    private const string StudentEmail = "aluno@edtech.local";
    private const string KrigorStudentEmail = "krigordesousa@gmail.com";
    private const string DefaultPassword = "Edtech@123";
    private const int AdditionalCoordinatorCount = 5;
    private const int AdditionalProfessorCount = 9;
    private const int AdditionalStudentCount = 20;
    private static readonly (string Title, string Description, decimal Price, string ModuleTitle)[] AdditionalCourseCatalog =
    {
        (
            "Engenharia de Prompt e IA Generativa",
            "Trilha pratica para criar prompts, estruturar contexto e operar fluxos com modelos generativos.",
            990.00m,
            "Fundamentos de Prompt Design"
        ),
        (
            "Cyberseguranca para Aplicacoes Web",
            "Boas praticas de autenticacao, autorizacao, protecao de dados e endurecimento de APIs.",
            1360.00m,
            "Fundamentos de Seguranca em APIs"
        ),
        (
            "Mobile com React Native",
            "Construcao de apps mobile multiplataforma com foco em componentes, navegacao e consumo de APIs.",
            1275.00m,
            "Primeiros Fluxos Mobile"
        ),
        (
            "QA e Automacao de Testes",
            "Cobertura de testes, automacao funcional e estrategias para reduzir regressao em produtos digitais.",
            1090.00m,
            "Base de Qualidade e Automacao"
        )
    };

    public static async Task SeedAsync(PlataformaContext context)
    {
        var admin = await EnsureAdminAsync(context);
        var coordinator = await EnsureCoordinatorAsync(context);
        var professor = await EnsureProfessorAsync(context);
        var student = await EnsureStudentAsync(context);
        var krigorStudent = await EnsureKrigorStudentAsync(context);
        var additionalCoordinators = await EnsureAdditionalCoordinatorsAsync(context);
        var additionalProfessors = await EnsureAdditionalProfessorsAsync(context);
        var additionalStudents = await EnsureAdditionalStudentsAsync(context);
        var professoresParaTurmas = new List<Professor> { professor };
        professoresParaTurmas.AddRange(additionalProfessors);

        await context.SaveChangesAsync();

        var fullStackCourse = await EnsureCourseAsync(
            context,
            title: "Desenvolvimento Web Full Stack",
            description: "Formacao com foco em front-end, back-end, APIs e deploy de aplicacoes.",
            price: 1299.90m,
            createdBy: admin.Id,
            coordinatorId: coordinator.Id);

        var dataCourse = await EnsureCourseAsync(
            context,
            title: "Ciencia de Dados Aplicada",
            description: "Trilha de analise, modelagem de dados e visualizacao para decisoes de negocio.",
            price: 1490.00m,
            createdBy: admin.Id,
            coordinatorId: coordinator.Id);

        var uxCourse = await EnsureCourseAsync(
            context,
            title: "UX para Produtos Digitais",
            description: "Curso voltado para pesquisa, prototipacao e desenho de experiencias educacionais.",
            price: 890.00m,
            createdBy: admin.Id,
            coordinatorId: coordinator.Id);

        var architectureCourse = await EnsureCourseAsync(
            context,
            title: "Arquitetura de Software Moderna",
            description: "Fundamentos de arquitetura, integracao entre servicos e organizacao de sistemas escalaveis.",
            price: 1590.00m,
            createdBy: admin.Id,
            coordinatorId: coordinator.Id);

        var pythonCourse = await EnsureCourseAsync(
            context,
            title: "Python para Automacao e Dados",
            description: "Aplicacoes praticas com scripts, automacao de processos e leitura de dados para produtos digitais.",
            price: 1190.00m,
            createdBy: admin.Id,
            coordinatorId: coordinator.Id);

        var devOpsCourse = await EnsureCourseAsync(
            context,
            title: "DevOps e Cloud Foundations",
            description: "Bases de infraestrutura, pipelines e publicacao de aplicacoes em ambientes de nuvem.",
            price: 1390.00m,
            createdBy: admin.Id,
            coordinatorId: coordinator.Id);

        await EnsureAdditionalCoursesAndModulesAsync(context, admin.Id, additionalCoordinators);

        await context.SaveChangesAsync();

        var additionalCourseTitles = AdditionalCourseCatalog.Select(item => item.Title).ToArray();
        var additionalCourses = await context.Cursos
            .Where(item => additionalCourseTitles.Contains(item.Titulo))
            .ToListAsync();
        var additionalCoursesByTitle = additionalCourses.ToDictionary(item => item.Titulo);
        var promptEngineeringCourse = additionalCoursesByTitle[AdditionalCourseCatalog[0].Title];

        var fundamentosWebModule = await EnsureModuloAsync(context, "Fundamentos da Web Moderna", fullStackCourse.Id);
        await EnsureModuloAsync(context, "APIs e Integracao", fullStackCourse.Id);
        await EnsureModuloAsync(context, "Analise Explorataria de Dados", dataCourse.Id);

        await context.SaveChangesAsync();

        var seededCoursesForClasses = new List<Curso>
        {
            fullStackCourse,
            dataCourse,
            uxCourse,
            architectureCourse,
            pythonCourse,
            devOpsCourse
        };
        seededCoursesForClasses.AddRange(AdditionalCourseCatalog.Select(item => additionalCoursesByTitle[item.Title]));

        Turma? fullStackClass = null;
        var cursosComTurma = seededCoursesForClasses.DistinctBy(item => item.Id).ToList();
        for (var index = 0; index < cursosComTurma.Count; index++)
        {
            var course = cursosComTurma[index];
            var professorResponsavel = EscolherProfessorParaTurma(professoresParaTurmas, index);
            var turma = await EnsureTurmaAsync(context, CriarNomeTurmaPadrao(course), course.Id, professorResponsavel.Id);

            if (course.Id == fullStackCourse.Id)
            {
                fullStackClass = turma;
            }
        }

        fullStackClass ??= await EnsureTurmaAsync(context, CriarNomeTurmaPadrao(fullStackCourse), fullStackCourse.Id, professor.Id);

        await context.SaveChangesAsync();

        await EnsureApprovedEnrollmentAsync(context, student, fullStackCourse, fullStackClass);
        await EnsurePendingEnrollmentAsync(context, additionalStudents[0], uxCourse);
        await EnsurePendingEnrollmentAsync(context, additionalStudents[1], architectureCourse);
        await EnsurePendingEnrollmentAsync(context, additionalStudents[2], pythonCourse);
        await EnsurePendingEnrollmentAsync(context, additionalStudents[3], devOpsCourse);
        await EnsurePendingEnrollmentAsync(context, additionalStudents[4], promptEngineeringCourse);
        await EnsurePendingEnrollmentIfAbsentAsync(context, krigorStudent, uxCourse);
        await EnsurePendingEnrollmentIfAbsentAsync(context, krigorStudent, architectureCourse);
        await EnsurePendingEnrollmentIfAbsentAsync(context, krigorStudent, pythonCourse);

        await context.SaveChangesAsync();

        await EnsureConteudoAsync(
            context,
            professor,
            fullStackClass,
            fundamentosWebModule,
            title: "Boas-vindas ao modulo",
            description: "Visao geral da jornada, combinados da turma e pontos de partida para a trilha.",
            bodyText: "Neste modulo vamos alinhar o ritmo da turma, revisar os fundamentos da web e preparar a base para os proximos projetos.",
            displayOrder: 1);

        await EnsureConteudoAsync(
            context,
            professor,
            fullStackClass,
            fundamentosWebModule,
            title: "Conteudo de teste - primeira pratica Full Stack",
            description: "Atividade rapida para validar a exibicao de novos materiais na trilha do aluno.",
            bodyText: "Use este material de teste para conferir a liberacao do conteudo, a marcacao de conclusao e a atualizacao do progresso do curso.",
            displayOrder: 2);

        await context.SaveChangesAsync();
    }

    private static async Task<Admin> EnsureAdminAsync(PlataformaContext context)
    {
        var admin = await context.Admins.FirstOrDefaultAsync(user => user.Email == AdminEmail);

        if (admin is null)
        {
            admin = new Admin();
            context.Admins.Add(admin);
        }

        admin.Nome = "Administrador CodeRyse";
        admin.Email = AdminEmail;
        admin.Cpf = "11111111111";
        admin.Telefone = "11999990001";
        admin.Cep = "01001-000";
        admin.Rua = "Rua da Plataforma";
        admin.Numero = "100";
        admin.Bairro = "Centro";
        admin.Cidade = "Sao Paulo";
        admin.Estado = "SP";
        admin.ConfigurarAcesso("Admin", BCrypt.Net.BCrypt.HashPassword(DefaultPassword));

        return admin;
    }

    private static async Task<Coordenador> EnsureCoordinatorAsync(PlataformaContext context)
    {
        return await EnsureCoordinatorAsync(
            context,
            name: "Coordenacao Academica",
            email: CoordinatorEmail,
            cpf: "22222222222",
            phone: "11999990002");
    }

    private static async Task<List<Coordenador>> EnsureAdditionalCoordinatorsAsync(PlataformaContext context)
    {
        var coordinators = new List<Coordenador>();

        for (var index = 1; index <= AdditionalCoordinatorCount; index++)
        {
            coordinators.Add(await EnsureCoordinatorAsync(
                context,
                name: $"Coordenador Teste {index:00}",
                email: $"coordenador.teste{index:00}@edtech.local",
                cpf: $"{22300000000L + index:00000000000}",
                phone: $"1177777{index:0000}"));
        }

        return coordinators;
    }

    private static async Task<Coordenador> EnsureCoordinatorAsync(
        PlataformaContext context,
        string name,
        string email,
        string cpf,
        string phone)
    {
        var coordinator = await context.Coordenadores.FirstOrDefaultAsync(user => user.Email == email);

        if (coordinator is null)
        {
            coordinator = new Coordenador();
            context.Coordenadores.Add(coordinator);
        }

        coordinator.Nome = name;
        coordinator.Email = email;
        coordinator.Cpf = cpf;
        coordinator.Telefone = phone;
        coordinator.Cep = "01001-000";
        coordinator.Rua = "Rua da Plataforma";
        coordinator.Numero = "120";
        coordinator.Bairro = "Centro";
        coordinator.Cidade = "Sao Paulo";
        coordinator.Estado = "SP";
        coordinator.ConfigurarAcesso("Coordenador", BCrypt.Net.BCrypt.HashPassword(DefaultPassword));
        await EnsureCoordinatorRegistrationCodeAsync(context, coordinator);

        return coordinator;
    }

    private static async Task<Professor> EnsureProfessorAsync(PlataformaContext context)
    {
        return await EnsureProfessorAsync(
            context,
            name: "Professor Demo",
            email: ProfessorEmail,
            cpf: "33333333333",
            phone: "11999990003",
            specialty: "Full Stack e Dados");
    }

    private static async Task<List<Professor>> EnsureAdditionalProfessorsAsync(PlataformaContext context)
    {
        var specialties = new[]
        {
            "Dados aplicados e BI",
            "Pesquisa UX e produto digital",
            "Arquitetura e microsservicos",
            "Python e automacao de dados",
            "Cloud e DevOps",
            "IA generativa e prompt design",
            "Cyberseguranca aplicada",
            "Mobile com React Native",
            "QA e automacao de testes"
        };
        var professores = new List<Professor>();

        for (var index = 1; index <= AdditionalProfessorCount; index++)
        {
            professores.Add(await EnsureProfessorAsync(
                context,
                name: $"Professor Teste {index:00}",
                email: $"professor.teste{index:00}@edtech.local",
                cpf: $"{33400000000L + index:00000000000}",
                phone: $"1166666{index:0000}",
                specialty: specialties[index - 1]));
        }

        return professores;
    }

    private static async Task<Professor> EnsureProfessorAsync(
        PlataformaContext context,
        string name,
        string email,
        string cpf,
        string phone,
        string specialty)
    {
        var professor = await context.Professores.FirstOrDefaultAsync(user => user.Email == email);

        if (professor is null)
        {
            professor = new Professor();
            context.Professores.Add(professor);
        }

        professor.Nome = name;
        professor.Email = email;
        professor.Cpf = cpf;
        professor.Telefone = phone;
        professor.Cep = "01001-000";
        professor.Rua = "Rua da Plataforma";
        professor.Numero = "140";
        professor.Bairro = "Centro";
        professor.Cidade = "Sao Paulo";
        professor.Estado = "SP";
        professor.ConfigurarAcesso("Professor", BCrypt.Net.BCrypt.HashPassword(DefaultPassword));
        await EnsureProfessorRegistrationCodeAsync(context, professor);
        professor.Especialidade = specialty;

        return professor;
    }

    private static async Task<Aluno> EnsureStudentAsync(PlataformaContext context)
    {
        return await EnsureStudentAsync(
            context,
            name: "Aluno Demo",
            email: StudentEmail,
            cpf: "44444444444",
            phone: "11999990004",
            enrollment: "MAT-DEMO-2026");
    }

    private static async Task<Aluno> EnsureKrigorStudentAsync(PlataformaContext context)
    {
        var student = await context.Alunos.FirstOrDefaultAsync(user => user.Email == KrigorStudentEmail);

        if (student is null)
        {
            return await EnsureStudentAsync(
                context,
                name: "Krigor Sousa",
                email: KrigorStudentEmail,
                cpf: "44599999999",
                phone: "11999990099",
                enrollment: "ALU-KRIGOR");
        }

        student.Nome = "Krigor Sousa";
        student.Matricula = "ALU-KRIGOR";

        return student;
    }

    private static async Task<List<Aluno>> EnsureAdditionalStudentsAsync(PlataformaContext context)
    {
        var students = new List<Aluno>();

        for (var index = 1; index <= AdditionalStudentCount; index++)
        {
            students.Add(await EnsureStudentAsync(
                context,
                name: $"Aluno Teste {index:00}",
                email: $"aluno.teste{index:00}@edtech.local",
                cpf: $"{44500000000L + index:00000000000}",
                phone: $"1188888{index:0000}",
                enrollment: $"MAT-TESTE-2026-{index:00}"));
        }

        return students;
    }

    private static async Task<Aluno> EnsureStudentAsync(
        PlataformaContext context,
        string name,
        string email,
        string cpf,
        string phone,
        string enrollment)
    {
        var student = await context.Alunos.FirstOrDefaultAsync(user => user.Email == email);

        if (student is null)
        {
            student = new Aluno();
            context.Alunos.Add(student);
        }

        student.Nome = name;
        student.Email = email;
        student.Cpf = cpf;
        student.Telefone = phone;
        student.Cep = "01001-000";
        student.Rua = "Rua da Plataforma";
        student.Numero = "160";
        student.Bairro = "Centro";
        student.Cidade = "Sao Paulo";
        student.Estado = "SP";
        student.ConfigurarAcesso("Aluno", BCrypt.Net.BCrypt.HashPassword(DefaultPassword));
        student.Matricula = enrollment;

        return student;
    }

    private static async Task<Curso> EnsureCourseAsync(
        PlataformaContext context,
        string title,
        string description,
        decimal price,
        int createdBy,
        int? coordinatorId)
    {
        var course = await context.Cursos.FirstOrDefaultAsync(item => item.Titulo == title);

        if (course is null)
        {
            course = new Curso
            {
                Titulo = title,
                Descricao = description,
                Preco = price,
                CriadoPor = createdBy,
                CoordenadorId = coordinatorId
            };

            context.Cursos.Add(course);
        }

        await EnsureCourseRegistrationCodeAsync(context, course);
        return course;
    }

    private static async Task EnsureAdditionalCoursesAndModulesAsync(
        PlataformaContext context,
        int createdBy,
        IReadOnlyList<Coordenador> additionalCoordinators)
    {
        var seededCourses = new List<(Curso Course, string ModuleTitle)>();

        for (var index = 0; index < AdditionalCourseCatalog.Length; index++)
        {
            var courseSeed = AdditionalCourseCatalog[index];
            var coordinator = additionalCoordinators[index % additionalCoordinators.Count];

            var course = await EnsureCourseAsync(
                context,
                title: courseSeed.Title,
                description: courseSeed.Description,
                price: courseSeed.Price,
                createdBy: createdBy,
                coordinatorId: coordinator.Id);

            seededCourses.Add((course, courseSeed.ModuleTitle));
        }

        await context.SaveChangesAsync();

        foreach (var seededCourse in seededCourses)
        {
            await EnsureModuloAsync(context, seededCourse.ModuleTitle, seededCourse.Course.Id);
        }
    }

    private static async Task<Turma> EnsureTurmaAsync(PlataformaContext context, string name, int courseId, int professorId)
    {
        var turmasDoCurso = await context.Turmas
            .Where(item => item.CursoId == courseId)
            .OrderBy(item => item.DataCriacao)
            .ThenBy(item => item.Id)
            .ToListAsync();
        var turma = turmasDoCurso.FirstOrDefault();

        if (turma is not null)
        {
            turma.NomeTurma = name;
            turma.ProfessorId = professorId;

            await ConsolidarTurmasDuplicadasAsync(context, turma, turmasDoCurso.Skip(1));
            await EnsureTurmaRegistrationCodeAsync(context, turma);
            return turma;
        }

        turma = new Turma
        {
            NomeTurma = name,
            CursoId = courseId,
            ProfessorId = professorId
        };

        context.Turmas.Add(turma);
        await EnsureTurmaRegistrationCodeAsync(context, turma);
        return turma;
    }

    private static async Task ConsolidarTurmasDuplicadasAsync(
        PlataformaContext context,
        Turma turmaPadrao,
        IEnumerable<Turma> turmasDuplicadas)
    {
        foreach (var turmaDuplicada in turmasDuplicadas)
        {
            var matriculas = await context.Matriculas
                .Where(item => item.TurmaId == turmaDuplicada.Id)
                .ToListAsync();
            foreach (var matricula in matriculas)
            {
                matricula.VincularTurma(turmaPadrao.Id);
            }

            var conteudos = await context.ConteudosDidaticos
                .Where(item => item.TurmaId == turmaDuplicada.Id)
                .ToListAsync();
            foreach (var conteudo in conteudos)
            {
                conteudo.TurmaId = turmaPadrao.Id;
            }

            var avaliacoes = await context.Avaliacoes
                .Where(item => item.TurmaId == turmaDuplicada.Id)
                .ToListAsync();
            foreach (var avaliacao in avaliacoes)
            {
                avaliacao.TurmaId = turmaPadrao.Id;
            }

            context.Turmas.Remove(turmaDuplicada);
        }
    }

    private static Professor EscolherProfessorParaTurma(IReadOnlyList<Professor> professores, int turmaIndex)
    {
        if (professores.Count == 0)
        {
            throw new InvalidOperationException("Nenhum professor disponivel para atribuir a turma padrao.");
        }

        return professores[turmaIndex % professores.Count];
    }

    private static string CriarNomeTurmaPadrao(Curso course)
    {
        var titulo = string.IsNullOrWhiteSpace(course.Titulo)
            ? "Curso"
            : course.Titulo.Trim();
        var nome = $"Turma online - {titulo}";

        return nome.Length <= 120
            ? nome
            : nome[..120].TrimEnd();
    }

    private static async Task EnsureTurmaRegistrationCodeAsync(PlataformaContext context, Turma turma)
    {
        if (!string.IsNullOrWhiteSpace(turma.CodigoRegistro))
        {
            return;
        }

        for (var tentativa = 0; tentativa < 10; tentativa++)
        {
            var codigo = CodigoRegistroGenerator.GerarTurma();
            var emUsoLocal = context.Turmas.Local.Any(item =>
                !ReferenceEquals(item, turma) &&
                item.CodigoRegistro == codigo);
            var emUsoBanco = await context.Turmas.AnyAsync(item =>
                item.Id != turma.Id &&
                item.CodigoRegistro == codigo);

            if (!emUsoLocal && !emUsoBanco)
            {
                turma.CodigoRegistro = codigo;
                return;
            }
        }

        throw new InvalidOperationException("Nao foi possivel gerar um codigo de registro unico para a turma de teste.");
    }

    private static async Task<Modulo> EnsureModuloAsync(PlataformaContext context, string title, int courseId)
    {
        var modulo = await context.Modulos.FirstOrDefaultAsync(item => item.Titulo == title && item.CursoId == courseId);

        if (modulo is null)
        {
            modulo = new Modulo
            {
                Titulo = title,
                CursoId = courseId
            };

            context.Modulos.Add(modulo);
        }

        await EnsureModuleRegistrationCodeAsync(context, modulo);
        return modulo;
    }

    private static async Task EnsureCourseRegistrationCodeAsync(PlataformaContext context, Curso course)
    {
        if (!string.IsNullOrWhiteSpace(course.CodigoRegistro))
        {
            return;
        }

        for (var tentativa = 0; tentativa < 10; tentativa++)
        {
            var codigo = CodigoRegistroGenerator.GerarCurso();
            var emUsoLocal = context.Cursos.Local.Any(item =>
                !ReferenceEquals(item, course) &&
                item.CodigoRegistro == codigo);
            var emUsoBanco = await context.Cursos.AnyAsync(item =>
                item.Id != course.Id &&
                item.CodigoRegistro == codigo);

            if (!emUsoLocal && !emUsoBanco)
            {
                course.CodigoRegistro = codigo;
                return;
            }
        }

        throw new InvalidOperationException("Nao foi possivel gerar um codigo de registro unico para o curso de teste.");
    }

    private static async Task EnsureProfessorRegistrationCodeAsync(PlataformaContext context, Professor professor)
    {
        if (!string.IsNullOrWhiteSpace(professor.CodigoRegistro))
        {
            return;
        }

        for (var tentativa = 0; tentativa < 10; tentativa++)
        {
            var codigo = CodigoRegistroGenerator.GerarProfessor();
            var emUsoLocal = context.Professores.Local.Any(item =>
                !ReferenceEquals(item, professor) &&
                item.CodigoRegistro == codigo);
            var emUsoBanco = await context.Professores.AnyAsync(item =>
                item.Id != professor.Id &&
                item.CodigoRegistro == codigo);

            if (!emUsoLocal && !emUsoBanco)
            {
                professor.CodigoRegistro = codigo;
                return;
            }
        }

        throw new InvalidOperationException("Nao foi possivel gerar um codigo de registro unico para o professor de teste.");
    }

    private static async Task EnsureCoordinatorRegistrationCodeAsync(PlataformaContext context, Coordenador coordinator)
    {
        if (!string.IsNullOrWhiteSpace(coordinator.CodigoRegistro))
        {
            return;
        }

        for (var tentativa = 0; tentativa < 10; tentativa++)
        {
            var codigo = CodigoRegistroGenerator.GerarCoordenador();
            var emUsoLocal = context.Coordenadores.Local.Any(item =>
                !ReferenceEquals(item, coordinator) &&
                item.CodigoRegistro == codigo);
            var emUsoBanco = await context.Coordenadores.AnyAsync(item =>
                item.Id != coordinator.Id &&
                item.CodigoRegistro == codigo);

            if (!emUsoLocal && !emUsoBanco)
            {
                coordinator.CodigoRegistro = codigo;
                return;
            }
        }

        throw new InvalidOperationException("Nao foi possivel gerar um codigo de registro unico para o coordenador de teste.");
    }

    private static async Task EnsureModuleRegistrationCodeAsync(PlataformaContext context, Modulo modulo)
    {
        if (!string.IsNullOrWhiteSpace(modulo.CodigoRegistro))
        {
            return;
        }

        for (var tentativa = 0; tentativa < 10; tentativa++)
        {
            var codigo = CodigoRegistroGenerator.GerarModulo();
            var emUsoLocal = context.Modulos.Local.Any(item =>
                !ReferenceEquals(item, modulo) &&
                item.CodigoRegistro == codigo);
            var emUsoBanco = await context.Modulos.AnyAsync(item =>
                item.Id != modulo.Id &&
                item.CodigoRegistro == codigo);

            if (!emUsoLocal && !emUsoBanco)
            {
                modulo.CodigoRegistro = codigo;
                return;
            }
        }

        throw new InvalidOperationException("Nao foi possivel gerar um codigo de registro unico para o modulo de teste.");
    }

    private static async Task EnsureConteudoAsync(
        PlataformaContext context,
        Professor professor,
        Turma turma,
        Modulo modulo,
        string title,
        string description,
        string bodyText,
        int displayOrder)
    {
        var conteudo = await context.ConteudosDidaticos.FirstOrDefaultAsync(item =>
            item.ProfessorAutorId == professor.Id &&
            item.TurmaId == turma.Id &&
            item.ModuloId == modulo.Id &&
            item.Titulo == title);

        if (conteudo is null)
        {
            conteudo = new ConteudoDidatico
            {
                TurmaId = turma.Id,
                ModuloId = modulo.Id
            };
            conteudo.DefinirProfessorAutor(professor.Id);
            conteudo.RegistrarCriacao(DateTime.UtcNow.AddDays(-2));

            context.ConteudosDidaticos.Add(conteudo);
        }

        conteudo.Titulo = title;
        conteudo.Descricao = description;
        conteudo.TipoConteudo = TipoConteudoDidatico.Texto;
        conteudo.CorpoTexto = bodyText;
        conteudo.ArquivoUrl = string.Empty;
        conteudo.LinkUrl = string.Empty;
        conteudo.OrdemExibicao = displayOrder;
        conteudo.PesoProgresso = 1;
        conteudo.DefinirStatusPublicacao(StatusPublicacao.Publicado, DateTime.UtcNow.AddDays(-1));
        conteudo.MarcarAtualizacao(DateTime.UtcNow.AddDays(-1));
    }

    private static async Task EnsureApprovedEnrollmentAsync(
        PlataformaContext context,
        Aluno student,
        Curso course,
        Turma turma)
    {
        var enrollment = await context.Matriculas.FirstOrDefaultAsync(item =>
            item.AlunoId == student.Id &&
            item.CursoId == course.Id &&
            item.TurmaId == turma.Id);

        if (enrollment is null)
        {
            enrollment = new Matricula
            {
                AlunoId = student.Id,
                CursoId = course.Id
            };
            enrollment.VincularTurma(turma.Id);
            enrollment.Aprovar();
            enrollment.RegistrarSolicitacao(DateTime.UtcNow.AddDays(-5));
            enrollment.LancarNotaFinal(8.75m);

            context.Matriculas.Add(enrollment);
        }
        else
        {
            enrollment.AprovarComTurma(turma.Id, course.Id);
            if (enrollment.NotaFinal == 0)
            {
                enrollment.LancarNotaFinal(8.75m);
            }
        }

        await EnsureEnrollmentRegistrationCodeAsync(context, enrollment);
    }

    private static async Task EnsurePendingEnrollmentAsync(PlataformaContext context, Aluno student, Curso course)
    {
        var enrollments = await context.Matriculas
            .Where(item =>
                item.AlunoId == student.Id &&
                item.CursoId == course.Id)
            .OrderBy(item => item.DataSolicitacao)
            .ThenBy(item => item.Id)
            .ToListAsync();

        var activeEnrollment = enrollments.FirstOrDefault(item => item.Status == StatusMatricula.Aprovada);
        if (activeEnrollment is not null)
        {
            await EnsureEnrollmentRegistrationCodeAsync(context, activeEnrollment);

            foreach (var pendingDuplicate in enrollments.Where(item => item.Status == StatusMatricula.Pendente))
            {
                pendingDuplicate.Cancelar();
            }

            return;
        }

        var enrollment = enrollments.FirstOrDefault(item => item.Status == StatusMatricula.Pendente);

        if (enrollment is not null)
        {
            await EnsureEnrollmentRegistrationCodeAsync(context, enrollment);
            return;
        }

        var pendingEnrollment = new Matricula
        {
            AlunoId = student.Id,
            CursoId = course.Id
        };
        pendingEnrollment.RegistrarSolicitacao(DateTime.UtcNow.AddDays(-1));
        await EnsureEnrollmentRegistrationCodeAsync(context, pendingEnrollment);

        context.Matriculas.Add(pendingEnrollment);
    }

    private static async Task EnsurePendingEnrollmentIfAbsentAsync(PlataformaContext context, Aluno student, Curso course)
    {
        var enrollment = await context.Matriculas.FirstOrDefaultAsync(item =>
            item.AlunoId == student.Id &&
            item.CursoId == course.Id);

        if (enrollment is not null)
        {
            await EnsureEnrollmentRegistrationCodeAsync(context, enrollment);
            return;
        }

        await EnsurePendingEnrollmentAsync(context, student, course);
    }

    private static async Task EnsureEnrollmentRegistrationCodeAsync(PlataformaContext context, Matricula enrollment)
    {
        if (!string.IsNullOrWhiteSpace(enrollment.CodigoRegistro))
        {
            return;
        }

        for (var tentativa = 0; tentativa < 10; tentativa++)
        {
            var codigo = CodigoRegistroGenerator.GerarMatricula();
            var emUsoLocal = context.Matriculas.Local.Any(item =>
                !ReferenceEquals(item, enrollment) &&
                item.CodigoRegistro == codigo);
            var emUsoBanco = await context.Matriculas.AnyAsync(item =>
                item.Id != enrollment.Id &&
                item.CodigoRegistro == codigo);

            if (!emUsoLocal && !emUsoBanco)
            {
                enrollment.CodigoRegistro = codigo;
                return;
            }
        }

        throw new InvalidOperationException("Nao foi possivel gerar um codigo de registro unico para a matricula de teste.");
    }
}
