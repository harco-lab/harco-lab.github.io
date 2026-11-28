---
title: Hyundai Mobis Mobile Manipulator Whole Body Control
mintitle: Mobile Manipulator Whole Body Control
image: images/project/mobile_manipulator_whole_body_control/main.png
group: past
tags:
  - Ergonomics
  - Mobile Manipulator
  - Cooperative Robot
fund: Hyundai Mobis
date_start: 2022-08-01
date_end: 2024-04-30
role: Coordinator
redirect_from:
  - /2022/08/01/project-Mobis_MobileManipulator/
  - /2022/08/01/project_mobis_mobile_manipulator.html
---
#### Goal of This Project
* Development of a whole-body control algorithm for mobile manipulators

***

#### Project Contents
**Whole-body control of mobile manipulator for dynamic stability implementation**

- Corner module-based mobile manipulator (manipulator 6 degrees of freedom , mobile 12 degrees of freedom)
- Whole-body optimal control framework using the redundancy of mobile manipulator to perform multitasks
- Control to mitigate impact in case of contact with environment

**Task configuration techniques for implementing Environment adaptability**

- Task priority determination algorithms that change the robot’s task priorities according to human willingness to work or changes in the environment

{%
  include figure.html
  image="images/project/mobile_manipulator_whole_body_control/1.png"
%}

**Demo Scenarios**

{% capture col1 %}
{%
  include figure.html
  image="images/project/mobile_manipulator_whole_body_control/2.png"
  caption="Scenario 1) Reliable transport of loaded or gripped objects, even in unstructured terrain (e.g., slope, fine ground, etc.). Also, avoid collisions with the environment during transport and generate motion to stably transport objects in the event of a collision."
%}
{% endcapture %}
{% capture col2 %}
{%
  include figure.html
  image="images/project/mobile_manipulator_whole_body_control/3.png"
  caption="Scenario 2) If the mobile robot cannot access the target due to the surrounding environment, the system is stabilized by Whole Body control using the robot's Redundancy while grasping the target."
%}
{% endcapture %}
{% include two-col.html col1=col1 col2=col2 %}

***

#### Participating Researchers
* [Wansoo Kim](/members/wansoo_kim): Principal Investigator
* [Joonkyu No](/members/joonkyu_no): (S/W) Mobile Robot Control
* [Jaepil Jang](/members/jaepil_jang): (S/W) Whole Body Control, Task Planning
* [Seungmin Choi](/members/seungmin_choi): (S/W) Whole Body Control, Task Planning

***

#### Funding
{%
  include feature.html
  image="images/project/funders/hyundai_mobis.png"
  link='https://www.mobis.co.kr/kr/index.do'
%}
