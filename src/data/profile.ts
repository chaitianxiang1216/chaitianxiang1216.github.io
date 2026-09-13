export type EducationItem = {
  degree: string;
  institution: string;
  year: string;
};

export type ProjectItem = {
  name: string;
  technology: string;
  summary: string;
  responsibility: string[];
};

export type AwardItem = {
  title: string;
};

export type NoteItem = {
  title: string;
  date: string;
  tags: string;
  summary: string;
};

export type Profile = typeof profile;

export const profile = {
  name: "柴天祥",
  handle: "chaitianxiang",
  email: "tchaiaa@connect.ust.hk",
  role: "Master",
  organization: "School of Engineering·The Hong Kong University of Sicence and Science and Technology",
  secondaryRole: "Bachelor",
  secondaryOrganization: "School of Artificial Intelligence and Software Engineering·Zhengzhou University",
  contactLabel: "Room 0b00010010 E,East Point City",
  location: "Hong Kong,China",
  headline:
    "I own the natural passion for Artificial Intelligence",
  bio: [
    "",
    "",
    ""
  ],
  focusAreas: [
    "[RESEARCH AREA 1]",
    "[RESEARCH AREA 2]",
    "[RESEARCH AREA 3]",
  ],
  education: [
    {
      degree: "[DEGREE]",
      institution: "[INSTITUTION]",
      year: "[YEAR]",
    },
    {
      degree: "[DEGREE]",
      institution: "[INSTITUTION]",
      year: "[YEAR]",
    },
  ] as EducationItem[],
  links: [
    { label: "[PERSONAL SITE]", url: "https://example.com" },
    { label: "[GITHUB]", url: "https://github.com/your-handle" },
    { label: "[LINKEDIN]", url: "https://linkedin.com/in/your-handle" },
  ],
  projects: [
    {
      name: "高并发电商平台优惠券系统",
      technology: "SpringBoot3、SpringCloudAlibaba、Nacos、Sentinel、Skywalking、RocketMQ 5.x、ElasticSearch、Redis、MySQL、EasyExcel、XXL-Job、Redisson 等",
      summary:
        "高并发电商平台优惠券系统，助力用户便捷领取和平台分发优惠券红包，促进商家销售和平台GMV指标提升。平台包括优惠券秒杀、分发、结算以及搜索等业务，支持大量用户同时进行优惠券领取功能，以及完成平台百万级别用户优惠券分发功能，保障不漏发、不多发等特性。使用缓存、分库分表、RocketMQ5.x以及Sentinel等技术支撑平台稳定运行",
      responsibility: [
        "通过责任链模式验证商家创建优惠券提交参数是否正确，保障验证代码高内聚、低耦合，保障了开闭原则",
        "为了支持大量商家创建优惠券记录，采用ShardingSphere分库分表方案，以提升优惠券模板的存储和查询效率",
        "通过线程池ThreadPoolExecutor和Redisson延时队列异步执行解析Excel文件行数，降低创建优惠券推送接口响应时间",
        "为避免系统耦合，通过消息队列RocketMQ解耦用户优惠券推送和通知逻辑，后管模块发送推送消息并由分发模块进行消费",
        "为防止恶意请求导致的缓存击穿和穿透问题，采用布隆过滤器、缓存空值和分布式锁等方法进行解决",
        "通过Lua脚本对获取不到优惠券的用户执行快速失败，并采用编程式事务以减少事务时间。底层使用MySQL悲观行记录锁机制，避免优惠券模板库存的多扣减",
        "为避免数据库扣减库存成功后添加用户优惠券缓存失败，基于监听Binlog机制异步添加用户优惠券缓存，并采用写后查询策略应对Redis持久化或主从复制极端情况下的数据丢失问题",
        "开发用户获取优惠券可用/不可用列表功能，使用Redis Pipeline管道命令提升获取优惠券模板详情，性能提升一倍以上，并随着用户领取优惠券的增多，性能还会持续提升",
      ],
    },
    {
      name: "手写Java动态线程池2.0版",
      technology: "Spring、SpringBoot、JUC、Tomcat、Nacos、Apollo、Prometheus、Grafana 等",
      summary:
        "1.0版本的线程池是独立手写实现了一个基于池化技术，支持任务提交、任务缓冲、线程复用与优雅关闭等功能的线程池，采用生产者-消费者模型，通过阻塞队列实现任务与线程的解耦。此外线程池支持非核心空闲线程自动回收、拒绝策略等机制。线程池覆盖线程并发控制、AQS等JUC核心机制的实现与理解。而2.0版本的线程池是基于配置中心Nacos实现的可观测动态线程池框架，核心价值是弥补了1.0版本的线程池以及JUC包下的线程池参数配置不灵活的问题，支持核心线程数在线的动态调整、运行时监控、阈值告警，有效提升了线程池的可运维性",
      responsibility: [
        "前期阅读分析JUC包中Doug Lea编写的线程池源码，钻研并理解掌握源码中的优秀设计思想与并发环境下竞态条件的考虑。阅读美团技术团队文章，深入分析GitHub开源框架Hippo4j的实现原理与设计思想",
        "从零构建动态线程池基础组件库，基于SpringBoot Starter自动装配逻辑，实现动态线程池一键集成与快速启动，降低接入成本",
        "基于配置中心实现动态线程池核心参数动态刷新能力，采用模板方法设计模式复用刷新逻辑，支持多种配置中心统一处理",
        "基于JDK的InnovationHandler动态代理，对线程池拒绝策略进行代理扩展，拦截任务拒绝事件并联动告警机制，实现任务丢弃的实时响应与通知",
        "基于SpringBoot Actuator实现动态线程池的Mertics监控，集成Prometheus实现线程池运行时指标采集与可视化，支持自定义标签，精细化监控线程池的状态",
      ],
    },
    {
      name: "企业级Ragent电商平台智能体问答引擎",
      technology: "SpringBoot、MyBatis Plus、PgVector、Redis、Redisson、Tika、Sa-Token、RAGAS、MCP等",
      summary:
        "Ragent是基于Java17+SpringBoot 3 构建的企业级RAG系统，解决企业知识库检索与智能问答场景中的信息孤岛和效率提升问题。提供多路检索引擎、意图识别、问题重写、会话记忆、MCP工具调用等核心能力。系统采用多模型路由与熔断降级机制，支持高并发场景下的稳定服务。通过分布式队列限流和全链路追踪，保障系统在并发下的可用性与可观测性。",
      responsibility: ["基于LLM构建意图识别树，覆盖知识库问答、工具调用(MCP)、系统指令意图，低置信度时自动触发澄清反问，意图识别Top-1准确率达90%+",
"基于LLM实现问题重写与子问题拆分，支持多轮对话上下文补全与复杂问题并行子查询，结合术语归一化与规则兜底,Recall@1提升18.8%",
"集成MCP协议扩展工具调用能力，基于意图识别路由工具、LLM自动提取参数，支持多工具并行调用，打通知识检索与外部系统",
"基于Redis信号量+ZSET+Pub/Sub实现分布式排队限流，Lua脚本保证原子性，支持公平排队与超时拒绝，SSE实时推送队列状态",
"搭建基于RAGAS的端到端RAG评测体系，覆盖检索、延迟、回答质量三大维度共20+指标，支持A/B Diff对比与人工校正，驱动答案忠诚度(faithfulness)+10.3%、答案相关性+8.0%等关键指标持续迭代",
"基于自研轻量级链路追踪，自动采集traceId、span 耗时、入参出参与异常堆栈，异步场景结合TTL透传保证链路不断裂，trace数据异步落库支撑性能定位",
"在framework层实现双维度幂等机制，通过注解防止用户重复提交表单，支持SpEL表达式生成唯一Key，配合Redis实现分布式幂等控制",
"基于Apache Tika实现PDF/Word/Excel/Markdown多格式解析，配合固定窗口+滑动重叠+结构感知多种分块策略与元数据增强，保留语义完整性提升召回质量"],
    },
  ] as ProjectItem[],
  awards: [
    { title: "浙江大学2024年PAT甲级程序设计一等奖" },
    { title: "2023年度国家级大学生创新创业训练计划项目“疲劳驾驶异常检测关键技术研究”项目验收通过" },
    { title: "郑州大学2022-2023学年度优秀学生奖学金二等奖" },
    { title: "郑州大学2021-2022学年度优秀学生奖学金二等奖" },
    { title: "郑州大学2021-2022学年度计算机与人工智能学院三好学生" },
  ] as AwardItem[],
  notes: [
    {
      title: "[NOTE TITLE 1]",
      date: "[YYYY-MM-DD]",
      tags: "[TAG 1], [TAG 2]",
      summary:
        "[A short summary of the note and why it may be useful to a reader.]",
    },
    {
      title: "[NOTE TITLE 2]",
      date: "[YYYY-MM-DD]",
      tags: "[TAG 1], [TAG 2]",
      summary:
        "[A short summary of the note and why it may be useful to a reader.]",
    },
    {
      title: "[NOTE TITLE 3]",
      date: "[YYYY-MM-DD]",
      tags: "[TAG 1], [TAG 2]",
      summary:
        "[A short summary of the note and why it may be useful to a reader.]",
    },
  ] as NoteItem[],
  lastUpdated: "Thursday 10 Sept 2026",
};
