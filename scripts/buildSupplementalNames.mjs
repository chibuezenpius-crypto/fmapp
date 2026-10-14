// Appends name pools for countries missing from globalNameDatabase.json. Idempotent; existing countries are never touched.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Name pools for the countries missing from globalNameDatabase.json (part 1: Europe, Asia).
// Each pool is whitespace-separated. Countries slice their required count out of the pool.
const poolsA = {
  turkish: {
    f: 'Mehmet Mustafa Ahmet Ali Hasan Hüseyin İbrahim İsmail Yusuf Murat Emre Burak Can Cem Kerem Onur Serkan Volkan Barış Kaan Arda Berkay Efe Mert Furkan Oğuz Selçuk Tolga Uğur Yiğit Zafer Deniz Enes Gökhan Halil Kadir Orhan Ramazan Sinan Tuncay Ufuk Vedat Yasin Çağlar Doğan Erdem Fatih Hakan Koray Levent Cengiz',
    l: 'Yılmaz Kaya Demir Şahin Çelik Yıldız Yıldırım Öztürk Aydın Özdemir Arslan Doğan Kılıç Aslan Çetin Kara Koç Kurt Özkan Şimşek Polat Korkmaz Çakır Erdoğan Güneş Aksoy Aktaş Bulut Tekin Güler Türk Acar Karaca Ateş Bozkurt Kaplan Özer Yavuz Sönmez Duman Erdem Taş Soylu Uçar Bayram Eren Tunç Coşkun Başaran Kalkan Akın',
  },
  polish: {
    f: 'Jakub Jan Szymon Kacper Filip Michał Mateusz Piotr Paweł Marcin Krzysztof Tomasz Łukasz Adam Bartosz Dawid Maciej Wojciech Karol Damian Dominik Sebastian Grzegorz Rafał Kamil Patryk Mariusz Artur Robert Marek Andrzej Stanisław Zbigniew Wiktor Oskar Igor Hubert Przemysław Antoni Radosław Błażej Cezary Dariusz Henryk Leszek Mirosław Norbert Bogdan Janusz Ryszard',
    l: 'Nowak Kowalski Wiśniewski Wójcik Kowalczyk Kamiński Lewandowski Zieliński Szymański Woźniak Dąbrowski Kozłowski Jankowski Mazur Kwiatkowski Krawczyk Piotrowski Grabowski Pawłowski Michalski Zając Król Wieczorek Jabłoński Wróbel Majewski Olszewski Jaworski Malinowski Pawlak Witkowski Walczak Stępień Górski Rutkowski Michalak Sikora Ostrowski Baran Duda Szewczyk Tomaszewski Pietrzak Marciniak Wróblewski Zalewski Jakubowski Jasiński Zawadzki Sadowski Bąk',
  },
  ukrainian: {
    f: 'Oleksandr Andriy Serhiy Volodymyr Dmytro Mykola Ivan Taras Bohdan Maksym Artem Denys Yuriy Vasyl Oleh Ihor Roman Pavlo Viktor Mykhailo Anatoliy Vitaliy Ruslan Yaroslav Stepan Danylo Kostiantyn Valentyn Petro Hryhoriy Zinoviy Oleksiy Vadym Anton Illya Heorhiy Lev Marko Nazar Semen Timur Eduard Rostyslav Bohuslav Myroslav Orest Svyatoslav Yevhen Borys Hennadiy Vsevolod',
    l: 'Shevchenko Kovalenko Bondarenko Tkachenko Kravchenko Boyko Kovalchuk Melnyk Shevchuk Koval Polishchuk Bondar Tkachuk Moroz Marchenko Lysenko Rudenko Savchenko Petrenko Kravets Oliynyk Sydorenko Kuzmenko Hnatiuk Danylenko Lytvynenko Pavlenko Zinchenko Yaremchuk Karpenko Mazur Honchar Tymoshenko Romanenko Dovzhenko Franko Symonenko Hrytsenko Antonenko Kryvenko Nesterenko Kolomiyets Vovk Panchenko Stasiuk Zhuk Yakymenko Hrushevsky Oleksenko Sorokopud Havryliuk Kuchma',
  },
  russian: {
    f: 'Aleksandr Dmitri Sergei Andrei Alexei Ivan Mikhail Nikolai Vladimir Pavel Yuri Maxim Artem Denis Igor Roman Evgeny Viktor Oleg Anton Vasily Konstantin Anatoly Boris Gleb Fyodor Kirill Stanislav Timur Vadim Valery Leonid Georgy Ilya Arkady Grigory Matvey Semyon Egor Daniil Timofey Ruslan Vitaly Yaroslav Gennady Lev Rodion Zakhar Mark Platon Svyatoslav',
    l: 'Ivanov Smirnov Kuznetsov Popov Vasiliev Petrov Sokolov Mikhailov Novikov Fedorov Morozov Volkov Alekseev Lebedev Semenov Egorov Pavlov Kozlov Stepanov Nikolaev Orlov Andreev Makarov Nikitin Zakharov Zaitsev Soloviev Borisov Yakovlev Grigoriev Romanov Vorobiev Sergeev Kuzmin Frolov Aleksandrov Dmitriev Korolev Gusev Kiselev Ilyin Maksimov Polyakov Sorokin Vinogradov Kovalev Belov Medvedev Antonov Tarasov Zhukov Komarov',
  },
  serbian: {
    f: 'Nemanja Milan Marko Stefan Nikola Luka Aleksandar Dusan Filip Vladimir Milos Ivan Bojan Dragan Goran Zoran Branko Darko Dejan Slobodan Vuk Lazar Uros Petar Mihajlo Andrija Djordje Nenad Predrag Radovan Sasa Vojislav Zlatan Danilo Mladen Igor Veljko Strahinja Stevan Jovan Bratislav Ognjen Rados Miroslav Mirko Obrad Savo Bosko Rade Dragoslav Vesko',
    l: 'Jovanovic Petrovic Nikolic Markovic Djordjevic Stojanovic Ilic Stankovic Pavlovic Milosevic Popovic Todorovic Kostic Vasic Savic Jankovic Mitrovic Lazic Radovic Matic Tomic Knezevic Maksimovic Simic Ristic Vukovic Milenkovic Bogdanovic Zivkovic Dimitrijevic Obradovic Cvetkovic Gavrilovic Mihajlovic Veselinovic Peric Babic Pantic Rakic Jevtic Filipovic Bozic Stevanovic Nedeljkovic Lukic Andric Kovacevic Kralj Dragic Vujic Pesic Zdravkovic',
  },
  czech: {
    f: 'Jan Jiří Petr Pavel Tomáš Martin Jaroslav Miroslav Zdeněk Michal Lukáš Ondřej Marek David Vojtěch Filip Adam Jakub Daniel Radek Libor Karel Milan Vladimír Roman Aleš Dušan Patrik Matěj Štěpán Václav Josef František Antonín Vít Dominik Šimon Kryštof Matyáš Viktor Ladislav Rostislav Bohumil Luboš Oldřich Hynek Vilém Bedřich Zbyněk Radim',
    l: 'Novák Svoboda Novotný Dvořák Černý Procházka Kučera Veselý Horák Němec Marek Pospíšil Pokorný Hájek Král Jelínek Růžička Beneš Fiala Sedláček Doležal Zeman Kolář Navrátil Čermák Urban Vaněk Blažek Kříž Kovář Bartoš Vlček Polák Musil Kopecký Šimek Konečný Malý Holub Čech Štěpánek Staněk Kadlec Dostál Soukup Šťastný Mareš Sýkora Moravec Tichý Bureš Hrubý',
  },
  hungarian: {
    f: 'László István József János Zoltán Sándor Gábor Ferenc Attila Péter Tamás Károly Lajos Miklós András Balázs Dániel Bence Ádám Máté Levente Zsolt Csaba Gergely Dávid Krisztián Norbert Richárd Roland Tibor Viktor Ákos Barnabás Botond Dominik Gyula Imre Kálmán Mihály Árpád Béla Endre Géza Huba Olivér Szabolcs Vilmos Zsombor Benedek Dezső Elemér',
    l: 'Nagy Kovács Tóth Szabó Horváth Varga Kiss Molnár Németh Farkas Balogh Papp Takács Juhász Lakatos Mészáros Oláh Simon Rácz Fekete Szilágyi Török Fehér Balázs Gál Kis Szűcs Kocsis Pintér Fodor Orbán Deák Hegedűs Gulyás Biró Bogdán Lukács Katona Sipos Magyar Vörös Antal Budai Bodnár Fülöp Illés Pál Sándor Szalai Jakab Szántó Kerekes',
  },
  romanian: {
    f: 'Ion Gheorghe Vasile Constantin Nicolae Mihai Andrei Alexandru Marius Cristian Florin Bogdan Adrian Dan Ionuț Daniel Răzvan Cătălin Sorin Radu Ștefan Valentin Lucian Ovidiu Liviu Cosmin Dorin Eugen Dumitru Petru Viorel Tudor Mircea Emil Octavian Silviu Costel Gabriel Claudiu Darius Vlad Horia Laurențiu Remus Teodor Sebastian Traian Virgil Zamfir Ilie Marian Aurel',
    l: 'Popescu Ionescu Popa Stan Dumitru Gheorghe Stoica Constantin Dinu Marin Mihai Radu Matei Munteanu Șerban Tudor Barbu Lazăr Rusu Ciobanu Moldovan Toma Dragomir Preda Vasile Ene Nistor Florea Dobre Stanciu Ilie Ungureanu Costache Neagu Avram Cristea Manea Diaconu Anghel Lupu Rotaru Georgescu Grigore Iordache Oprea Pavel Sima Bucur Coman Pop Cojocaru',
  },
  greek: {
    f: 'Giorgos Dimitris Nikos Kostas Yannis Panagiotis Christos Thanasis Vasilis Michalis Antonis Stelios Manolis Alexandros Petros Spyros Lefteris Pavlos Evangelos Stavros Fotis Haris Giannis Ioannis Sotiris Apostolos Theodoros Kyriakos Aris Stefanos Andreas Marios Orestis Odysseas Tasos Argyris Leonidas Periklis Ilias Miltos Takis Zisis Savvas Menelaos Achilleas Nektarios Babis Lazaros Filippos Vangelis Notis',
    l: 'Papadopoulos Vlachos Angelopoulos Nikolaidis Georgiou Dimitriou Karagiannis Makris Papadakis Pappas Alexiou Ioannou Konstantinou Oikonomou Theodorou Vasileiou Antoniou Christodoulou Karras Kalogeropoulos Stavrou Petrou Michailidis Samaras Galanis Katsaros Manolas Tsakiris Zervas Lazaridis Papageorgiou Kotsiras Sideris Mavridis Economou Stathopoulos Zografos Pantelidis Kokkinos Rallis Diamantis Fotiou Tsolakis Kyriakou Papanikolaou Doukas Kostopoulos Argyros Voulgaris Chatzis Giannakopoulos',
  },
  danish: {
    f: 'Mads Mikkel Rasmus Jens Lars Søren Henrik Anders Morten Thomas Kasper Frederik Jesper Niels Peter Jakob Emil Magnus Oliver Christian Nikolaj Lasse Simon Tobias Mathias Kristian Rune Bjarke Esben Hjalmar Viggo Valdemar Anton Carsten Torben Ole Flemming Gunnar Poul Thorkild Erik Knud Bent Ebbe Jeppe Jonas Malthe Villads Alfred Mogens',
    l: 'Jensen Nielsen Hansen Pedersen Andersen Christensen Larsen Sørensen Rasmussen Jørgensen Petersen Madsen Kristensen Olsen Thomsen Christiansen Poulsen Johansen Møller Mortensen Knudsen Jakobsen Jacobsen Mikkelsen Olesen Frederiksen Laursen Henriksen Lund Holm Schmidt Eriksen Kristiansen Simonsen Clausen Svendsen Andreasen Iversen Østergaard Jeppesen Vestergaard Nissen Lauritsen Kjær Jespersen Mogensen Nørgaard Jessen Dalgaard Bech Brandt Friis',
  },
  finnish: {
    f: 'Juha Mikko Jari Antti Timo Matti Kari Petri Jukka Markus Teemu Janne Tuomas Ville Joonas Eetu Aleksi Eero Lauri Olli Samuli Tommi Kimmo Harri Pekka Heikki Esa Risto Seppo Veikko Arto Jouni Sakari Elias Oskari Onni Veeti Rasmus Niko Santeri Topi Valtteri Perttu Jaakko Kalle Tapio Urho Aarne Reijo Väinö Eino',
    l: 'Korhonen Virtanen Mäkinen Nieminen Mäkelä Hämäläinen Laine Heikkinen Koskinen Järvinen Lehtonen Lehtinen Saarinen Salminen Heinonen Niemi Heikkilä Kinnunen Salonen Turunen Salo Laitinen Tuominen Rantanen Karjalainen Jokinen Mattila Savolainen Lahtinen Ahonen Kallio Ojala Leppänen Hiltunen Manninen Pitkänen Lindholm Aaltonen Hakala Räsänen Peltonen Kauppinen Väisänen Koivisto Miettinen Lindroos Sillanpää Pulkkinen Hirvonen Immonen Tikkanen',
  },
  bulgarian: {
    f: 'Georgi Ivan Dimitar Nikolay Stoyan Petar Hristo Todor Vasil Atanas Stefan Krasimir Plamen Rumen Kiril Boris Aleksandar Yordan Martin Zdravko Svetoslav Miroslav Ventsislav Valentin Emil Daniel Radoslav Lyubomir Stanimir Venelin Angel Borislav Iliya Tsvetan Kaloyan Mihail Veselin Metodi Nikola Simeon Yavor Preslav Bozhidar Aleksey Dobromir Galin Ognyan Trifon Evgeni Rosen Stilyan',
    l: 'Ivanov Georgiev Dimitrov Petrov Todorov Nikolov Hristov Stoyanov Angelov Iliev Kolev Yordanov Mihaylov Popov Vasilev Kostov Atanasov Stefanov Marinov Simeonov Draganov Genov Tsvetkov Radev Dimov Pavlov Naydenov Penev Kirilov Slavov Borisov Zhelev Ganev Velikov Hadzhiev Stanchev Lazarov Mitev Zahariev Minchev Peev Tonev Rusev Andonov Valchev Yanev Manolov Bozhilov Delchev Hristozov Tanev Vladimirov',
  },
  hebrew: {
    f: 'David Yossi Moshe Avi Itay Eyal Gal Omer Noam Yonatan Daniel Amir Tomer Ofir Idan Roi Shay Lior Ran Ido Nir Guy Eli Uri Yaniv Barak Doron Asaf Elad Oren Tal Amit Ron Dor Matan Yuval Nadav Eitan Hagai Ariel Ben Yair Shlomi Meir Ilan Zvi Haim Avraham Itzik Gidon',
    l: 'Cohen Levi Mizrahi Peretz Biton Dahan Avraham Friedman Malka Azulay Katz Yosef Amsalem Weiss Goldberg Shapira Hadad Segal Klein Rosen Sasson Dayan Golan Barak Navon Ohayon Tamir Zohar Shalom Gabay Harel Eliyahu Nahum Rubin Stern Meir Ashkenazi Baruch Elbaz Schwartz Hazan Lavi Carmi Erez Rosenberg Amar Vaknin Mor Sharabi Ben-Haim',
  },
  swiss: {
    f: 'Luca Noah Leon Nico Fabian Lukas Marco Reto Urs Beat Hans Peter Thomas Daniel Andreas Christian Markus Stefan Martin Roger Matthias Patrick Dominik Pascal Sandro Cédric Yann Loris Diego Silvan Nils Jonas Gian Mauro Livio Ueli Rudolf Walter Heinz Kurt Bruno Ruedi Fritz Niklaus Reinhard Daniele Valentin Joel Elia Ramon',
    l: 'Müller Meier Schmid Keller Weber Huber Schneider Meyer Steiner Fischer Gerber Brunner Baumann Frei Zimmermann Moser Widmer Wyss Graf Roth Heller Berger Suter Bachmann Gasser Hofmann Ammann Bühler Marti Egger Lüthi Kunz Studer Burri Zürcher Odermatt Camenzind Albrecht Bosshard Rüegg Tschumi Locher Notter Hürlimann Gisler Haas Imhof Küng Wenger Tanner',
  },
  austrian: {
    f: 'Franz Josef Johann Karl Wolfgang Herbert Gerhard Manfred Helmut Rudolf Friedrich Alois Anton Georg Leopold Ferdinand Florian Maximilian Sebastian Tobias Stefan Michael Christoph Matthias Lukas Felix Julian Paul Jakob Clemens Philipp Moritz Valentin Benedikt Dominik Fabian Emanuel Raphael Alexander Thomas Andreas Bernhard Günther Harald Hubert Norbert Reinhold Siegfried Ernst Gottfried',
    l: 'Gruber Huber Bauer Wagner Müller Pichler Steiner Moser Mayer Hofer Leitner Berger Fuchs Eder Fischer Schmid Winkler Weber Schwarz Maier Schneider Reiter Mayr Schmidt Wimmer Egger Brunner Lang Baumgartner Auer Binder Lechner Wolf Wallner Aigner Ebner Koller Lehner Haas Schuster Haider Holzer Strasser Kainz Zauner Hinterberger Ortner Neuhold Stocker Prinz',
  },
  albanian: {
    f: 'Arben Besnik Dritan Erion Fatos Genc Ilir Jetmir Kujtim Lorik Mirlind Naim Orges Petrit Qamil Rexhep Shpend Tomor Valon Xhevat Ylli Zef Agim Bardh Dren Edon Flamur Granit Hajdar Ismet',
    l: 'Hoxha Shehu Dervishi Gjoka Basha Berisha Krasniqi Gashi Morina Hasani Rama Kelmendi Shala Bytyqi Mustafa Ahmeti Kastrati Prenga Dushku Leka Marku Nikolli Prifti Muca Lleshi Cani Hysa Zeqiri Aliu Rexhepi Sadiku',
  },
  icelandic: {
    f: 'Gunnar Sigurdur Gudmundur Jon Olafur Magnus Einar Bjarni Kristjan Arni Thorsteinn Haraldur Eidur Hallgrimur Aron Birkir Hordur Johann Rurik Viktor',
    l: 'Gunnarsson Sigurdsson Gudmundsson Jonsson Olafsson Magnusson Einarsson Bjarnason Kristjansson Arnason Haraldsson Sigurjonsson Thorsteinsson Gislason Eiriksson Johannsson Palsson Stefansson Halldorsson Ragnarsson Sveinsson',
  },
  estonian: {
    f: 'Mart Jaan Toomas Andres Tiit Rein Priit Kristjan Siim Karl Taavi Ragnar Mihkel Madis Henri Sander Rasmus Markus Oskar Kaspar',
    l: 'Tamm Saar Sepp Mägi Kask Kukk Rebane Ilves Pärn Koppel Oja Luik Kaasik Lepik Raud Kallas Vaher Laur Paju Teder',
  },
  latvian: {
    f: 'Janis Andris Aigars Martins Raimonds Edgars Kristaps Artis Normunds Ilgvars Maris Guntis Ints Girts Uldis Valdis Dainis Roberts Renars Eriks',
    l: 'Berzins Kalnins Ozolins Liepins Jansons Krastins Ozols Balodis Vitols Eglitis Zarins Karklins Lacis Vanags Sprogis Rozitis Apsitis Millers Grinbergs Priede',
  },
  lithuanian: {
    f: 'Jonas Petras Antanas Kazimieras Vytautas Mindaugas Darius Tomas Rokas Arunas Gintaras Saulius Rimantas Algirdas Dainius Linas Paulius Justinas Edvinas Mantas',
    l: 'Kazlauskas Petrauskas Jankauskas Stankevicius Vasiliauskas Zukauskas Butkus Paulauskas Navickas Urbonas Kavaliauskas Sakalauskas Rimkus Norkus Balciunas Mockus Gudaitis Vaitkus Ramanauskas Simkus',
  },
  georgian: {
    f: 'Giorgi Davit Nikoloz Levan Irakli Zurab Lasha Guram Tornike Mamuka Shota Vakhtang Archil Beka Gela Otar Temur Merab Kakha Revaz',
    l: 'Beridze Kapanadze Gelashvili Maisuradze Lomidze Giorgadze Khutsishvili Tsiklauri Gogoladze Chkheidze Bakradze Chanturia Meladze Abashidze Jincharadze Dolidze Gabunia Kobakhidze Machavariani Tabatadze',
  },
  armenian: {
    f: 'Armen Artur Aram Hayk Narek Gor Tigran Vahe Levon Karen Vardan Samvel Sargis Hrant Garik Ashot Mkhitar Davit Vahan Arsen',
    l: 'Petrosyan Grigoryan Hovhannisyan Harutyunyan Sargsyan Avetisyan Karapetyan Hakobyan Mkrtchyan Manukyan Gevorgyan Vardanyan Danielyan Ghazaryan Melkonyan Stepanyan Poghosyan Khachatryan Abrahamyan Baghdasaryan',
  },
  azerbaijani: {
    f: 'Elnur Rashad Farid Tural Orkhan Samir Vugar Elchin Anar Ramil Kamran Namiq Murad Teymur Javid Ilgar Rovshan Nijat Emin Vusal',
    l: 'Aliyev Mammadov Huseynov Hasanov Guliyev Ismayilov Abdullayev Hajiyev Rzayev Mustafayev Gasimov Ibrahimov Safarov Najafov Sultanov Jafarov Valiyev Mirzayev Karimov Nasibov',
  },
  maltese: {
    f: 'Joseph Charles Mario Carmel Anthony Paul Michael Kurt Jean Clint Andrew Luke Ryan Jurgen Daniel Steve Chris Mark Julian Kyle',
    l: 'Borg Camilleri Vella Farrugia Zammit Galea Micallef Grech Attard Spiteri Azzopardi Bonnici Cassar Debono Mifsud Sciberras Agius Fenech Pace Muscat',
  },
  italianate: {
    f: 'Marco Luca Andrea Matteo Simone Davide Alberto Fabio Paolo Stefano Giorgio Carlo Mauro Enrico Gianluca Nicola Riccardo Federico Emanuele Lorenzo',
    l: 'Rossi Bianchi Ferrari Russo Esposito Romano Colombo Ricci Marino Greco Bruno Gallo Conti Costa Giordano Mancini Rizzo Lombardi Moretti Barbieri',
  },
  catalan: {
    f: 'Jordi Pere Joan Jaume Josep Marc Pau Oriol Arnau Albert Xavier Ferran Gerard Ramon Sergi Aleix Biel Genis Eloi Roger',
    l: 'Pons Puig Ferrer Soler Vila Serra Roca Vidal Mas Casals Prat Bosch Font Garriga Sala Riba Bertran Camps Torres Pujol',
  },
  english: {
    f: 'James Oliver Jack Harry George Thomas Daniel Matthew Joshua Ryan Liam Luke Connor Callum Jordan Adam Ben Samuel Joe Charlie Jake Josh Lewis Mason Cameron Ethan Nathan Tyler Kieran Aaron Reece Dean Scott Craig Shane Brett Jarrod Mitchell Lachlan Hamish Rhys Blake Riley Kane Jayden Declan Fraser Murray Angus Hayden Rowan',
    l: 'Smith Jones Taylor Brown Wilson Evans Walker White Thompson Roberts Johnson Wright Robinson Green Hall Wood Harris Clarke Jackson Turner Hill Moore Cooper Ward Morris King Watson Baker Harrison Bell Murphy Kelly Ryan Murray Campbell Stewart Anderson Mitchell Scott Russell Fraser Hughes Edwards Parker Collins Lee Young Carter Hunt Gray Reid',
  },
  persian: {
    f: 'Mohammad Ali Reza Hossein Hassan Mehdi Amir Saeed Majid Hamid Mahmoud Abbas Javad Kaveh Behnam Arash Babak Farhad Siavash Sina Navid Omid Ramin Pouya Milad Payam Shahin Kamran Bijan Dariush Cyrus Masoud Mostafa Ehsan Behrouz Vahid Nima Sasan Farzad Ardeshir Esmaeil Yousef Karim Bahman Jamshid Parviz Rostam Soheil Taher Yaser',
    l: 'Mohammadi Hosseini Ahmadi Rezaei Karimi Moradi Jafari Mousavi Hashemi Sadeghi Rahimi Kazemi Ebrahimi Ghorbani Akbari Taheri Rostami Heydari Shafiei Zarei Mahdavi Najafi Davoodi Farahani Asadi Abbasi Nazari Bagheri Naderi Esmaeili Alavi Fallah Jalali Salehi Tabatabaei Khorasani Shirazi Esfahani Tehrani Gholami Sharifi Daneshvar Pourmand Samadi Azizi Safavi Rahmani Parsa Kamali Shahbazi Mirzaei Nouri Amini',
  },
  turkic: {
    f: 'Aziz Bobur Jasur Sardor Otabek Rustam Timur Eldor Dilshod Farrukh Javlon Husan Sherzod Ulugbek Abdulla Akmal Anvar Bekzod Davron Doniyor Nurlan Daniyar Yerlan Azamat Talgat Bakyt Tilek Ermek Askar Bauyrzhan Aibek Kanat Marat Berdi Serdar Rejep Dovlet Myrat Maksat Zhanibek Sanzhar Arman Nurzhan Tulegen Chingiz Beksultan Atai Kubanych Ilkhom Mirjalol',
    l: 'Karimov Rakhimov Abdullayev Yusupov Ismoilov Saidov Tursunov Nazarov Usmonov Mirzaev Sultanov Ergashev Khasanov Qodirov Ibragimov Normatov Ashurov Yuldashev Rustamov Kamalov Khamidov Jurayev Hakimov Mamatov Suleimenov Akhmetov Kasymov Bekov Zhaparov Omarov Dosmailov Nurgaliev Satybaldiev Toktogulov Seitkaziev Orazov Berdiev Annayev Hojayev Atayev Garayev Rejepov Amanov Seitov Mukanov Zhumabayev Tleuov Abdrakhmanov Baibolov Kurbanov Ismailov Aliyev Toraev',
  },
  chinese: {
    f: 'Wei Lei Jun Hao Ming Tao Bo Qiang Yong Jie Peng Gang Hui Long Kai Xin Yu Feng Chen Dong Liang Bin Cheng Zhi Hong Jian Lin Xiang Yang Chao Rui Zhe Heng Shuo Yifan Zihan Haoran Junjie Mingyu Jiahao Yichen Ziyi Boyuan Zixuan Yuxuan Haotian Kaiwen Zhiqiang Guoliang Jianguo Xiaolong Dawei',
    l: 'Wang Li Zhang Liu Chen Yang Huang Zhao Wu Zhou Xu Sun Ma Zhu Hu Guo He Gao Lin Luo Zheng Liang Xie Song Tang Han Feng Deng Cao Peng Zeng Xiao Tian Dong Pan Yuan Cai Jiang Yu Du Ye Cheng Wei Su Lu Ding Ren Shen Yao Fan Zhong Jin Fu Qin',
  },
  korean_north: {
    f: 'Kwangho Myongchol Yongil Songhyok Hyonjin Chunho Namchol Sunjin Wonil Junghyon Kyongsu Insu Tongil Hakchol Jinhyok Ilsong Chanho Ungchol Gwangmyong Taeho',
    l: 'Kim Ri Pak Choe Jong Kang Jon Han Hong Ryu Yun Cha An Ho Ju Sin Song Yang Ma Mun',
  },
  thai: {
    f: 'Somchai Somsak Prasert Anan Chai Wichai Surachai Sompong Boonmee Kittisak Narong Pichai Samart Thanakorn Apirak Chatchai Natthaphong Pongsakorn Teerasak Worawut Kanchai Arthit Sarawut Nattapon Phuwadol Chanathip Supachai Theerathon Adisak Weerawat Kritsada Anucha Decha Nirut Parinya Rungroj Sakda Tawan Uthai Vichit Yutthana Itthi Manit Niran Pairote Rattana Siam Thawat Vira Winai Prakit',
    l: 'Saetang Srisai Chaiyasit Wongsawat Boonmak Phetcharat Srisuk Rattanakul Suwannarat Kaewmanee Thongchai Sirikul Jaidee Charoenphol Phromsiri Sukkasem Wattana Thanasarn Pongpan Khamsing Prasertsak Kongkaew Chantarasri Ruangsri Intarat Saengthong Buranakul Siriwat Maneerat Promsit Chaiyaphum Thepsuwan Kittikul Nakorn Pattanakul Wisetsuk Sombat Yongyut Piyapong Leelawat Chuenchom Mongkol Panyarat Ratanakosin Sawasdee Nimitr Suksai Wannasri Teerapat Samakom Phumipat',
  },
  vietnamese: {
    f: 'Anh Binh Cuong Dung Duc Hai Hieu Hoang Hung Huy Khanh Khoa Long Minh Nam Nghia Phong Phuc Quan Quang Quoc Son Tai Thang Thanh Tien Trung Tuan Tung Viet Vinh Vu Bao Dat Dang Duy Giang Hoa Hop Kien Lam Loc Manh Nhat Phat Thinh Thuan Toan Trong Truong Tri',
    l: 'Nguyen Tran Le Pham Hoang Huynh Phan Vu Vo Dang Bui Do Ho Ngo Duong Ly Dinh Truong Lam Mai Trinh Dao Ta Ha Luong Tang Quach Chau Diep Doan Cao Lu Phung Kieu Han Ung Thai Giang Vuong Banh Chu Ton Trieu Khuat Lac Tong Huu Nghiem Bach Au Kim Su',
  },
  indian: {
    f: 'Rahul Amit Vikram Rohit Sanjay Rajesh Suresh Anil Arjun Karan Vijay Manoj Deepak Ajay Ravi Sunil Nikhil Aditya Harsh Sachin Virat Rishabh Siddharth Pranav Ankit Gaurav Varun Kunal Mohan Prakash Ramesh Dinesh Ganesh Naveen Srinivas Venkat Krishna Hari Ishaan Kabir Aryan Dhruv Yash Tarun Vivek Mayank Shubham Abhishek Jasprit Mahendra Anirudh',
    l: 'Sharma Verma Gupta Singh Kumar Patel Reddy Nair Iyer Mehta Joshi Desai Kapoor Malhotra Chopra Khan Das Banerjee Chatterjee Mukherjee Ghosh Bose Menon Pillai Rao Naidu Shetty Kulkarni Deshmukh Patil Jadhav Pawar Yadav Mishra Pandey Tiwari Dubey Agarwal Bansal Saxena Bhatia Sethi Kohli Dhawan Gill Sandhu Sidhu Chauhan Thakur Rathore Shekhar',
  },
  bengali: {
    f: 'Mohammad Abdul Rahim Karim Hasan Hossain Shakib Tamim Mushfiqur Mahmudullah Mustafizur Sabbir Mehedi Taskin Liton Nasir Rubel Rony Imran Jahid Kamal Faruk Habib Sohel Shahid Rafiq Anwar Jamal Mizanur Nazrul Rashed Saiful Tanvir Zahid Arif Babul Dulal Emon Fahim Golam Harun Ismail Jubayer Khalid Lutfur Monir Nayeem Omar Parvez Rabiul',
    l: 'Rahman Ahmed Hossain Islam Uddin Khan Chowdhury Miah Sarker Alam Sheikh Mondal Talukder Siddique Hasan Karim Bhuiyan Das Roy Biswas Majumder Sikder Mollah Howlader Akter Haque Ali Kabir Mahmud Molla Munshi Pramanik Barua Dewan Hawlader Bepari Gazi Mia Rana Sardar Shikdar Bhuyan Rahim Zaman Ullah Ansari Malik Jamadar Patwari Choudhury',
  },
  urdu_punjabi: {
    f: 'Muhammad Ahmed Ali Hassan Usman Bilal Imran Kamran Faisal Shahid Zahid Nadeem Tariq Asif Naveed Salman Babar Shaheen Rizwan Fakhar Hafeez Wahab Sarfraz Azhar Yasir Junaid Haris Danish Waqar Wasim Inzamam Saeed Misbah Younis Shoaib Mohsin Adnan Arslan Farhan Hamza Ibrahim Jawad Khurram Luqman Mubashir Noman Omer Qasim Rashid Sohail Talha Zubair',
    l: 'Khan Ahmed Ali Malik Butt Sheikh Chaudhry Qureshi Siddiqui Ansari Mirza Hussain Iqbal Akhtar Raza Bhatti Gill Mughal Rajput Cheema Dar Lone Awan Baig Javed Aslam Niazi Yousafzai Afridi Durrani Gilani Shah Syed Abbasi Jatt Warraich Sandhu Tarar Virk Bajwa Randhawa Gondal Hashmi Farooqi Rehman Zafar Nawaz Bukhari Kayani Lodhi Rana',
  },
  indonesian: {
    f: 'Budi Agus Eko Joko Slamet Sutrisno Bambang Hendra Dedi Dian Rizky Fajar Andi Rudi Yudi Wahyu Arief Bayu Dimas Gilang Hadi Irfan Reza Ahmad Muhammad Ilham Rahmat Surya Taufik Teguh Wawan Yoga Zainal Adi Bagus Cahyo Dwi Faisal Galih Haris Indra Jaya Kurniawan Lukman Maman Nanda Oki Putra Rendra Sandy Toni',
    l: 'Santoso Wijaya Saputra Hidayat Kusuma Setiawan Pratama Nugroho Susanto Wibowo Hartono Gunawan Purnomo Siswanto Rahman Yulianto Kurniawan Firmansyah Hakim Ramadhan Prasetyo Utama Lestari Suryanto Sutanto Budiman Halim Tanoto Wahyudi Mulyadi Permana Maulana Irawan Sihombing Siregar Nasution Simanjuntak Harahap Lubis Hutapea Panjaitan Sinaga Pangaribuan Batubara Daulay Ginting Tarigan Sembiring Barus Purba Saragih Silalahi Manurung',
  },
  malay: {
    f: 'Ahmad Muhammad Mohd Abdul Hafiz Hakim Faisal Farid Azman Azlan Razak Zulkifli Rosli Ismail Ibrahim Yusof Omar Hassan Hussein Kamal Khairul Syafiq Syazwan Danial Aiman Amir Haikal Irfan Luqman Naim Nazrin Rizal Shahrul Zaki Zul Fadzli Badrul Mazlan Norhisham Shamsul Taufiq Zainal Aidil Fitri Izzuddin Jefri Khalid Mukhriz Nasir Razif',
    l: 'Abdullah Ahmad Ali Hassan Ibrahim Ismail Yusof Rahman Hamid Hussin Othman Omar Salleh Zakaria Daud Jaafar Kassim Latif Mahmud Mansor Nordin Rashid Sulaiman Tahir Wahab Yahya Zainal Aziz Bakar Din Ghani Hashim Idris Jamal Karim Lazim Mat Noor Osman Puteh Ramli Samad Taib Umar Wahid Yaacob Zin Harun Hamzah Halim Ariffin Abu Awang Bahari Deraman Ghazali',
  },
  singaporean: {
    f: 'Wei Jun Kai Zhi Hui Jia Hao Ming Rajesh Suresh Muhammad Ahmad Faiz Hafiz Ryan Daniel Jason Marcus Kevin Darren',
    l: 'Tan Lim Lee Ng Ong Wong Goh Chua Chan Koh Teo Ho Singh Kumar Rahman Ismail Abdullah Pillai Nair Hassan',
  },
  filipino: {
    f: 'Jose Juan Antonio Mark John Michael Angelo Jayson Rommel Ramil Ruben Alvin Emilio Fernando Carlo Paolo Neil Jericho Gabriel Raymond',
    l: 'Santos Reyes Cruz Bautista Ocampo Garcia Mendoza Torres Tomas Andres Castillo Flores Villanueva Ramos Aquino Delacruz Navarro Salazar Dizon Manalo',
  },
  mongolian: {
    f: 'Batbayar Ganbold Munkh Bold Enkh Tuvshin Erdene Altan Naran Gantulga Sukh Temuulen Dorj Tsogt Bayar Otgon Ariun Khuder Zorig Mend',
    l: 'Bold Dorj Ganbat Erdene Batsuh Tsend Naidan Gombo Sodnom Damdin Purev Bat Tumur Dashzeveg Nyamdorj Jamsran Luvsan Chimed Sanjaa Rinchin',
  },
  nepali: {
    f: 'Ram Hari Shyam Krishna Bikash Sanjay Prakash Rajan Anil Suresh Dipesh Bimal Kiran Sandeep Rohit Bishal Anjan Pawan Sagar Nabin',
    l: 'Sharma Thapa Gurung Rai Tamang Shrestha Magar Karki Adhikari Poudel Bhandari Khadka Basnet Limbu Lama Subedi Koirala Dahal Pandey Neupane',
  },
  sinhala: {
    f: 'Nuwan Chaminda Kumar Lasith Dinesh Angelo Tharanga Mahela Kusal Dimuth Dhananjaya Wanindu Charith Pathum Asitha Isuru Sachith Ruwan Kasun Janith',
    l: 'Perera Fernando Silva Jayasuriya Wickramasinghe Gunawardena Bandara Dissanayake Ranatunga Karunaratne Mendis Samaraweera Weerasinghe Herath Jayawardena Senanayake Amarasinghe Pathirana Liyanage Gamage',
  },
  myanmar: {
    f: 'Aung Kyaw Zaw Htet Min Thura Soe Naing Win Myo Hein Than Tun Moe Kaung Phyo Ye Lin Htun Thein',
    l: 'Aung Win Kyaw Naing Oo Htay Hlaing Tun Zaw Myint Maung Soe Thant Lwin Htwe Khin San Nyunt Swe Paing',
  },
  lao: {
    f: 'Somphone Khamla Bounmy Sengdao Phet Vilay Kham Thongsavanh Souk Anousone Chanthavong Latsamy Bounthavy Phongsavanh Somchit Keo Manh Vongsay Sisavath Saysana',
    l: 'Phommasone Sisavath Keomany Vongsay Souvannavong Xayavong Inthavong Phimmasone Sayavong Vilayphone Chanthavong Douangdara Khamphoui Manivong Soukaseum Sengsouvanh Thammavong Xaysana Bounnhang Vongxay',
  },
  khmer: {
    f: 'Sokha Vannak Sreng Chhay Rithy Sophal Dara Vuthy Piseth Samnang Channa Kosal Veasna Sokun Narith Pich Makara Borey Ratha Visal',
    l: 'Chea Sok Heng Keo Kim Ly Chan Phan Seng Sam Nhem Touch Vong Hem Meas Lim Ouk Ung Yim Khem',
  },
  dhivehi: {
    f: 'Ahmed Mohamed Ibrahim Hussain Ali Hassan Abdulla Ismail Adam Yoosuf Shiyam Naseem Imran Nizam Waheed Rasheed Latheef Jaleel Faisal Shafeeu',
    l: 'Ahmed Mohamed Ibrahim Hussain Ali Hassan Abdulla Ismail Adam Yoosuf Rasheed Waheed Naseem Latheef Shareef Zahir Didi Manik Fulhu Maniku',
  },
  bhutanese: {
    f: 'Tshering Dorji Karma Sonam Pema Jigme Tenzin Ugyen Kinley Wangchuk Namgay Chimi Sherab Lhendup Phuntsho Dawa Choki Thinley Yeshey Tashi',
    l: 'Dorji Wangchuk Tshering Namgyel Tenzin Penjor Gyeltshen Choden Dema Wangdi Zangmo Rinchen Tobgay Norbu Tamang Chophel Dukpa Gurung Drukpa Lhamo',
  },
  chamorro: {
    f: 'Joseph Vincent Jesse Anthony Michael Jerome Dominic Marcus Elias Gilbert Ray Ricky Tony Juan Jesus Pedro Frank Francisco Eddie Antonio',
    l: 'Cruz Quichocho Perez Santos Camacho Guerrero Taitano Blas Aguon Leonguerrero Sannicolas Duenas Mendiola Benavente Torres Flores Reyes Pangelinan Baza Castro Tenorio',
  },
  arabic_gulf: {
    f: 'Abdullah Mohammed Khalid Fahad Salman Saud Faisal Turki Nasser Sultan Hamad Rashid Saeed Mansour Majed Yousef Ali Omar Ibrahim Hassan Ahmad Talal Bandar Nawaf Meshal Jassim Hamdan Khalifa Zayed Ayman',
    l: 'Al-Harbi Al-Qahtani Al-Dosari Al-Ghamdi Al-Otaibi Al-Shehri Al-Zahrani Al-Mutairi Al-Shamrani Al-Mansoori Al-Kaabi Al-Thani Al-Marri Al-Hajri Al-Naimi Al-Ketbi Al-Dhaheri Al-Nuaimi Al-Balushi Al-Rashdi Al-Busaidi Al-Hinai Al-Mahrooqi Al-Ajmi Al-Enezi Al-Rashidi Al-Hakimi Al-Sanani Al-Najjar Al-Sayed Al-Amri',
  },
  arabic_levant: {
    f: 'Omar Khaled Samer Tarek Bassam Rami Fadi Hani Nizar Walid Mazen Jamal Salim Elias Georges Charbel Hussein Mahmoud Ibrahim Yousef Adnan Ziad Majd Wael Anas Hadi Marwan Rayan Karam Ghassan',
    l: 'Haddad Khoury Nasser Saleh Hamdan Mansour Issa Bishara Hourani Farah Aoun Karam Daher Sabbagh Najjar Masri Shami Halabi Khalil Barakat Abboud Jaber Salameh Ghanem Nahas Hakim Zein Qassem Darwish Rizk Tannous',
  },
};

// Name pools part 2: Africa, Americas, Oceania.
const poolsB = {
  arabic_maghreb: {
    f: 'Mohamed Ahmed Youssef Karim Yacine Rachid Hicham Samir Nabil Walid Amine Bilal Mehdi Sofiane Riyad Slimane Mourad Djamel Farid Hamza Anis Ismail Moncef Mahmoud Tarek Aymen Fares Zied Hatem Oussama',
    l: 'Benali Bouzid Belkacem Mansouri Ferhat Haddad Brahimi Slimani Khelifi Boumediene Cherif Amrani Saidi Zerrouki Bensalah Triki Jebali Trabelsi Hamdi Gharbi Ben-Youssef Ould-Ahmed Ould-Mohamed Ould-Cheikh Mokhtar Sidi Benzema Zidane Oueslati Bouazizi Messaoudi',
  },
  arabic_nile: {
    f: 'Mohamed Ahmed Abdallah Ibrahim Omar Hassan Hussein Ali Osman Idris Khalil Yousif Adam Mustafa Salah Nasr Taha Awad Babiker Elsayed Ismail Mahmoud Kamal Tarig Faisal Hamza Saleh Abdi Moussa Said Bacar',
    l: 'Abdelrahman Osman Idris Hamid Ahmed Suliman Ali Ibrahim Elhassan Khalifa Mahgoub Babiker Ismail Adam Yousif Omar Mohamed Hassan Awad Elamin Abdi Guelleh Houmed Said Mohamed Abdallah Mze Bacar Soilihi Ali',
  },
  central_american: {
    f: 'José Juan Carlos Luis Miguel Jorge Mario Oscar Victor Rafael Ricardo Roberto Edgar Wilmer Kevin Bryan Brayan Denis Allan Alberto Ronald Walter Erick Elmer Daniel Josué Henry Cristian Fabricio Marvin Ariel',
    l: 'Hernández López Martínez González Rodríguez Pérez García Ramírez Flores Castillo Morales Mejía Reyes Cruz Alvarado Aguilar Ortiz Vargas Chávez Rivera Salazar Navarro Cordero Barrantes Quirós Solís Arosemena Batista Zelaya Cabrera Duarte Mendoza',
  },
  hispanic_caribbean: {
    f: 'Yoel Yunier Yasiel Alexei Ernesto Reinaldo Pedro Jesús Luis Carlos Manuel Rafael Eduardo Angel Wilson Pablo Miguel Omar Edwin Hector Armando Andrés Giovanni Johan Jeison Yohan Ramón Víctor Franklin Julio',
    l: 'Rodríguez Fernández Pérez Díaz Hernández González Martínez Sánchez Ramírez Santana Peña Reyes Báez Mejía Pimentel Colón Rivera Rosario Matos Núñez Guerrero Acosta Linares Rojas Bolívar Salazar Ramos Cedeño Carrasquel Betancourt Machado Villalobos',
  },
  andean: {
    f: 'Luis Jorge Carlos José Juan Miguel Pedro Víctor Edison Segundo Washington Jefferson Walter Marlon Wilmer Cristian Renato Paolo Yoshimar Gianluca Alexis Marcelo Ronald Erwin Limberg Gonzalo Rolando Mauricio Jhon Franco',
    l: 'Quispe Mamani Flores Huamán Rojas Chávez Condori Vargas Ramírez Mendoza Torres Castillo Cueva Guerrero Farfán Carrillo Valencia Caicedo Mina Estupiñán Plata Cuero Ayoví Arce Moreno Justiniano Rivero Saucedo Cabrera Ortega',
  },
  southern_cone: {
    f: 'Matías Nicolás Felipe Sebastián Claudio Rodrigo Cristian Mauricio Gonzalo Esteban Ignacio Francisco Marcelo Eduardo Alexis Arturo Gary Jean Charles Dario Derlis Antonio Gustavo Roque Celso Néstor Óscar Hugo Pablo',
    l: 'González Muñoz Rojas Díaz Pérez Soto Contreras Silva Martínez Sepúlveda Morales Rodríguez López Fuentes Vidal Vargas Sánchez Núñez Cáceres Benítez Villalba Ayala Giménez Bogado Báez Gómez Escobar Romero Duarte Cardozo Ortiz Aquino',
  },
  lusophone_africa: {
    f: 'Manuel Joao Jose Antonio Carlos Luis Paulo Pedro Domingos Fernando Eduardo Helder Nelson Tony Ivan Nuno Edson Dario Wilson Jorge Rui Sergio Miguel Fabio Elton Nilton Zeca Mauro Bruno Aldair',
    l: 'Silva Santos Fernandes Pereira Gomes Costa Lopes Monteiro Tavares Rodrigues Almeida Mendes Barros Vaz Cardoso Correia Semedo Furtado Evora Lima Sousa Cabral Varela Mondlane Machel Chissano Sitoe Cossa Tembe Guambe Ramos',
  },
  polynesian: {
    f: 'Sione Tevita Mosese Viliami Soane Siosaia Poasi Feleti Paulo Samuela Tuilagi Alofa Faleolo Lemalu Seumalo Mata Tui Lopeti Tomasi Isileli Penitani Josefa Semisi Mikaele Fetu Siaosi Taniela Maka Leiataua Vaea',
    l: 'Tuilagi Fa\'asavalu Leota Tuala Fonoti Seumalo Lealaiauloto Penitani Taufa Vaipulu Fifita Tupou Latu Moala Havili Faleafa Tuiasosopo Ioane Tamapua Aufai Salesa Matagi Pouono Taumoepeau Faiva Toleafoa Saipaia Mafi Tonga Ma\'u',
  },
  melanesian: {
    f: 'Joseph Peter John Michael Moses Daniel Samuel Jacob Isaac Nicholas Raphael Wilson Gideon Elijah Kennedy Jerry Willie Tommy Sebastian Titus Alwin Felix Jonathan Stanley George Henry Dickson Basil Jeffrey Emmanuel',
    l: 'Kama Kila Kaupa Waka Tom Kalo Ben Namaliu Manu Nako Toka Kaluae Kiki Wari Bani Vira Sope Obed Kalpokas Natuman Vurobaravu Iau Tari Seri Hiele Maea Ofai Houkarawa Soalaoi Ragoso',
  },
  west_africa_fr: {
    f: 'Ousmane Moussa Ibrahim Issa Seydou Abdoulaye Boubacar Mamadou Souleymane Adama Idrissa Salif Yacouba Amadou Harouna Aboubacar Seyni Issoufou Rabiou Mahamadou Kossi Komlan Kodjo Koffi Yaovi Edem Dossou Romuald Gildas Rodrigue',
    l: 'Ouedraogo Traore Sawadogo Compaore Kabore Zongo Sankara Yameogo Tapsoba Konate Kone Diallo Sow Maiga Issoufou Amadou Hassane Abdou Oumarou Moussa Ahouansou Hounkpatin Agbodjan Houngbedji Adjovi Kokou Tchalla Mensah Lawson Adabra',
  },
  west_africa_en: {
    f: 'Mohamed Ibrahim Abdul Alhaji Sheku Foday Samuel Joseph Emmanuel Moses Prince Kenneth Patrick George Alieu Lamin Modou Ebrima Bakary Musa Omar Sulayman Pa Ousman Sainey Bubacarr Kaba Dawda Edward Sidi',
    l: 'Kamara Bangura Conteh Sesay Koroma Turay Kargbo Sankoh Jalloh Mansaray Jarju Ceesay Jallow Sanneh Touray Darboe Sowe Njie Manneh Bojang Cooper Johnson Weah Kollie Toure Dolo Wilson Doe Kpoto Flomo',
  },
  southern_bantu: {
    f: 'Chanda Mwansa Bwalya Kalusha Emmanuel Evans Isaac Felix Joseph Patrick Lameck Collins Stoppila Rainford Given Clement Gift Wisdom Chikondi Peter Esau Blessing Tendai Knowledge Tinashe Brian Prince Admire Kudakwashe Nyasha',
    l: 'Phiri Banda Mwale Zulu Tembo Lungu Mumba Chanda Sakala Daka Musonda Kalaba Mulenga Mbewe Chirwa Kaunda Moyo Ncube Dube Ndlovu Sibanda Nkomo Mutasa Chigumba Moyo Mhlanga Muzenda Chikwanha Gumbo Mpofu',
  },
  sotho_tswana: {
    f: 'Thabo Tebogo Kagiso Kabelo Neo Mpho Tshepo Lesego Katlego Boitumelo Teboho Lebohang Motlatsi Thato Mosa Sipho Mandla Sibusiso Bheki Themba Musa Nkosinathi Mthunzi Siyabonga Vusi Bongani Sabelo Mduduzi Lucky Mlungisi',
    l: 'Molefe Mokoena Dlamini Nkosi Mahlangu Sithole Motsepe Moeketsi Mosiane Letsie Seboka Khumalo Masilela Shongwe Gamedze Simelane Magagula Mamba Mabuza Fakudze Motswagole Kgosi Sebego Mmusi Seretse Tau Mogapi Phiri Ntsimane Keitumetse',
  },
  great_lakes: {
    f: 'Jean Claude Eric Patrick Emmanuel Olivier Innocent Gilbert Pacifique Fabrice Didier Moise Jacques Bosco Aime Fiston Cedric Elie Ismael Alexis Gael Francois Prosper Joel Karim Bonheur Vedaste Landry Alain Dieudonne',
    l: 'Habimana Nshimiyimana Uwimana Niyonzima Mugisha Ndayisaba Bizimana Nkurunziza Hakizimana Iradukunda Munyaneza Ndikumana Ntamuhanga Niyonkuru Havyarimana Uwamahoro Nsengiyumva Kanamugire Irambona Rukundo Bigirimana Mutabazi Nzeyimana Sinamenye Barakamfitiye Harerimana Ndayishimiye Manirakiza Rwasa Nahimana',
  },
  congolese: {
    f: 'Jean Pierre Joseph Patrick Pascal Christian Junior Fabrice Cedric Dieumerci Chancel Yannick Merveille Trésor Jackson Blaise Rolly Glody Elia Prince Gael Christopher Jordan Arsene Brice Jonathan Serge Fiston Henock Neeskens Bolasie Landry Mpoyi Cherif Mukendi Kapita Wilfried Dodo Lembo Obed Samuel Mavuba Grace Franck Axel Joel Eliezer Marcel Kevin Samy Dieudonne Platini Ruben Hyppolite',
    l: 'Mbemba Kabila Tshisekedi Mukendi Kabongo Ilunga Kalala Kasongo Mwamba Mutombo Tshibangu Mulumba Kanda Lukaku Bakambu Wissa Mbokani Kimpembe Bolingi Kakuta Kayembe Lumbu Mpoyi Ngoy Banza Kitenge Kalonji Kabeya Mujinga Nsimba Tshiala Lunda Makiese Mabiala Moukoko Ntoutou Mavoungou Ondo Obiang Ndong Mba Essono Nguema Ovono Bivini Abessolo Mouele Ebang Biyoghe Mintsa Nze Boupendza Bilong Moukila',
  },
  mande: {
    f: 'Mamadou Moussa Ibrahima Seydou Bakary Modibo Boubacar Amadou Sekou Sidiki Lamine Souleymane Cheick Drissa Kalifa Adama Salif Mahamadou Oumar Yacouba Aliou Mohamed Thierno Sory Abdoulaye Fode Mory Lansana Alhassane Naby Karim Ladji Mohamed-Lamine Daouda Gaoussou Bassirou Tidiane Ousmane Abdoul Kassoum Zoumana Brehima Nouhoum Bourama Fousseyni Hamidou Siaka Moriba Madou Samba Tiemoko Dramane Sadio',
    l: 'Keita Traore Coulibaly Diarra Konate Sissoko Camara Toure Doumbia Sidibe Dembele Diakite Sangare Cisse Kante Sylla Bah Diallo Conde Soumah Bangoura Soumaoro Fofana Sacko Camara Kourouma Haidara Maiga Dicko Tangara Sagara Samake Niare Fane Kone Fofanah Kaba Magassouba Oularé Berete Doumbouya Bagayoko Kouyate Dramé Sanogo Togola Dao Samaké Cissoko Dagnoko Maiga Diabate Konaré',
  },
  rsa: {
    f: 'Thabo Sipho Themba Mandla Bheki Siyabonga Sibusiso Lungile Mpho Tshepo Kagiso Bongani Vusi Lucky Percy Steven Benni Itumeleng Teko Bafana Dean Pieter Johan Jaco Francois Hendrik Willem Andre Gerhard Riaan Morne Wayne Brandon Keegan Darren Ryan Grant Craig Mark Anthony Siphiwe Aubrey Lebo Hlompho Khama Oupa Reneilwe Kermit Themba Mthokozisi Zakhele',
    l: 'Nkosi Dlamini Khumalo Ndlovu Zulu Sithole Mokoena Molefe Mahlangu Ngcobo Cele Mabaso Radebe Mthembu Mkhize Zungu Buthelezi Ntuli Shabalala Tshabalala Mashaba Majoro Modise Mphela Parker Pienaar Botha van-der-Merwe du-Plessis Kruger Visser Venter Steyn Coetzee Fourie Swanepoel Nel Jacobs Williams Abrahams Adams Davids Isaacs Petersen Fortuin Cupido Hendricks Mkhwanazi Madlala Gumede Ncube Mdluli',
  },
  kenyan: {
    f: 'Wanyama Dennis Victor Michael Joseph Peter John James Samuel Daniel David Paul Patrick George Francis Kevin Brian Eric Collins Duncan Kenneth Boniface Allan Ayub Johanna Eliud Geoffrey Abdi Hassan Hamisi Musa Ismael Kipchoge Kiprop Kipkemboi Kimani Mwangi Otieno Odhiambo Omondi Ochieng Onyango Mutua Kamau Njoroge Macharia Wafula Barasa Wekesa Juma Salim Mohamed',
    l: 'Otieno Odhiambo Omondi Ochieng Onyango Owino Okoth Oduor Mutua Musyoka Kamau Njoroge Mwangi Kariuki Macharia Wanjiru Kimani Githinji Njenga Kipchoge Kiprop Kipkemboi Kiplagat Koech Rotich Cheruiyot Kibet Bett Wafula Barasa Wekesa Simiyu Juma Hassan Salim Mohamed Abdi Ali Wanyama Oliech Mariga Origi Ouma Aluoch Akumu Okumu Okello Anyango Adhiambo Waweru Muriuki Karanja Gitau',
  },
  ugandan: {
    f: 'Emmanuel Moses Robert Geoffrey Denis Farouk Isaac Joseph Brian Samuel Ronald Godfrey Hassan Ibrahim Charles Mike Fred Yunus Abubaker Allan Bashir Derrick Julius Simon Timothy Tony Kizito Ivan Steven Enock Richard Peter Henry Frank Paul Jimmy Henry Vincent Ashraf Abdu Tom Kenneth Dan Brighton Marvin Rogers Joel Elvis Alex Jordan Titus Bobosi',
    l: 'Okello Opio Ochan Odong Okot Mugisha Kasozi Ssemakula Ssentamu Ssekitoleko Mukasa Kiwanuka Kizza Nsubuga Lubega Kato Wasswa Mubiru Kawooya Lwanga Ssali Byekwaso Tumwine Mwesigwa Kigozi Tumusiime Byaruhanga Kyomuhendo Ahimbisibwe Atuhaire Musinguzi Kabagambe Asiimwe Ainembabazi Kagimu Bwanika Walusimbi Kayemba Kasumba Kimera Ntege Sserunjogi Kalule Musoke Nakato Odur Mawejje Ochaya Oloya Aliga Mubiru',
  },
  tanzanian: {
    f: 'Mbwana Simon Mrisho Juma Hamisi Said Ally Abdul Salum Shabani Idrissa Omary Rashidi Athumani Bakari Issa Ramadhani Yusuf Amani Frank Erasto Himid Kelvin Novatus Aishi Feisal Ibrahim Abdulrazak Msuva Lawi Mohamed Elias Kibwana Bruno Benedict Deus Godfrey Haruna John Nickson Pascal Yacouba Shomari Cleophas Dickson Edward Ismail Nassoro Gadiel Salim',
    l: 'Samatta Msuva Kapombe Chilunda Ulimwengu Mkude Ngassa Mwakyusa Mrisho Salum Mussa Mohamed Mwinyi Kessy Mwakalebela Lyimo Mbwambo Massawe Mushi Kimaro Swai Mallya Temba Shirima Minja Mfinanga Nyerere Mkapa Kikwete Magufuli Mwamba Mdoe Kilimba Mapunda Chacha Marwa Wambura Mganga Mkwawa Sanga Mwanga Mwakilema Mwakasege Kibona Mgaya Komba Ndunguru Msigwa Mkumbo Luambano Mtui',
  },
  ethiopian: {
    f: 'Abebe Bekele Dawit Getachew Haile Kebede Mulugeta Tadesse Tesfaye Yohannes Girma Samuel Biniam Fasil Henok Kaleb Yonas Mesfin Berhanu Solomon Teklu Wondimu Alemayehu Assefa Desta Eyob Gebre Hailu Kassahun Lemma Mekonnen Nebiyu Selam Tsegaye Worku Yared Zerihun Amanuel Birhanu Dagim Elias Fikru Gizachew Habtamu Ketema Million Naod Surafel Temesgen Tilahun Yidnekachew',
    l: 'Tesfaye Bekele Kebede Alemu Tadesse Haile Gebremariam Abera Desta Girma Mekonnen Negash Wolde Gebru Hailu Assefa Worku Lemma Mulugeta Yimer Zewdu Ayele Berhe Demissie Eshetu Fikadu Getahun Habte Kassa Legesse Melaku Mengistu Nega Regassa Seyoum Teka Tilahun Woldemichael Yilma Zeleke Zerihun Abate Adane Amare Asfaw Bayu Dejene Endale Gashaw Hagos Kahsay Tekle Tsegay Ghebreselassie',
  },
  anglo_caribbean: {
    f: 'Marlon Andre Dwight Kemar Jermaine Shaun Devon Dane Troy Leon Clinton Winston Everton Curtis Courtney Rohan Omar Shamar Kyle Jahmal Nathaniel Tyrone Brandon Akeem Daniel Rashad Kevin Dexter Garfield Desmond Lennox Shervin Kareem Ronaldo Jamal Anthony Cleon Fitzroy Carlton Delroy Lloyd Orville Raheem Raymond Stephen Trevor Wayne Zachary Dominic Jerome',
    l: 'Williams Brown Campbell Thomas Johnson Henry Francis Charles Joseph Edwards Clarke Lewis Alexander Barnes Gordon Walker Bailey Grant Morgan Reid Thompson Wright Powell Pierre Baptiste Phillips Richards Samuel Benjamin Cuffy Forde Greaves Haynes Husbands Maynard Nurse Skeete Walcott Cumberbatch Daley Gittens Hinds Jordan Marshall Norville Rawlins Stoute Straker Taitt Trotman Weekes Wiltshire Yearwood',
  },
  malagasy: {
    f: 'Andry Hery Rija Faneva Tojo Mamy Njaka Rado Lanto Fidy Toky Anja Mahefa Tahina Nirina Haja Voahangy Fanomezana Jean Rivo',
    l: 'Rakotoarisoa Rasolofo Randrianasolo Rakotomalala Ratsimbazafy Razafindrakoto Andriamanana Rabemananjara Ranaivo Rasoanaivo Rakotondrabe Raharison Razanakoto Andrianjafy Rajaonarison Ratsiraka Rabe Randria Rakoto Rasolonjatovo',
  },
  mauritian: {
    f: 'Kevin Jean Marc Patrick Christopher Joël Yannick Kersley Jason Brian Anil Vishal Ravi Ashwin Sunil Dave Stephan Bryan Yan Jordan',
    l: 'Ramgoolam Seewoosagur Jugnauth Bhurtun Beeharry Ramsamy Appadoo Gopaul Doorgakant Pierre Lagesse Baptiste Koenig Rivet Genave Bonne Hosany Moonien Dookhun Mohabeer',
  },
  seychellois: {
    f: 'Kenny Jean Michel Alain Pierre Nigel Dave Marc Steve Ralph Andre Brian Terry Jude Gerard Wilfred Richard Danny Clifford Ivan',
    l: 'Hoareau Morel Esparon Payet Pillay Confiance Barbe Dugasse Bonnelame Adonis Azemia Labrosse Julie Mathiot Joubert Larue Mondon Monthy Sinon Valentin',
  },
  somali: {
    f: 'Abdi Abdullahi Ahmed Ali Farah Hassan Hussein Ibrahim Isse Jama Liban Mohamud Mohamed Nur Omar Osman Said Warsame Yusuf Abdirahman',
    l: 'Abdi Ahmed Ali Warsame Farah Hassan Hersi Jama Mohamud Nur Omar Osman Sheikh Yusuf Guled Dahir Egal Duale Barre Aden',
  },
  south_sudan: {
    f: 'Deng Majak Kuol Garang Akol Chol Mayen Makuei Ayuel Thon Bol Lual Aguek Kiir Wol Atem Manyang Dut Mabior Yak',
    l: 'Deng Garang Kuol Majok Mayen Akol Chol Bol Lual Thon Ayuel Mabior Makuei Wol Atem Dut Duot Mading Reec Aleu',
  },
  fijian: {
    f: 'Josefa Ratu Semi Inia Jone Epeli Ilaitia Isikeli Joeli Kitione Maika Naibuka Peceli Rusiate Samisoni Tevita Viliame Waisale Etuate Sireli',
    l: 'Vunivalu Naiqama Tuisova Nayacalevu Ravouvou Waqa Delai Bainimarama Cakobau Kunatuba Tuilagi Rokobiau Raikuna Qiolevu Ratuvou Seruvakula Veitokani Kaitani Naisau Tavuyara',
  },
  french_pacific: {
    f: 'Teva Manu Hiro Tehei Moana Tamatoa Rava Tiare Heimana Ariki Teiki Poema Maui Vaiana Tefana Titouan Jean Pierre Christophe Gael',
    l: 'Tehei Tetuanui Teriierooiterai Tuheiava Lenoir Pomare Tauhiro Mara Tefaatau Tamarii Poroi Vaitiare Wahetra Gope Naisseline Kaddour Tjibaou Waia Bearune Leopold',
  },
  haitian: {
    f: 'Jean Pierre Wilfrid Kervens Duckens Wilson Peterson Richard Ricardo Frantz Stanley Johnny Jonel Derrick Carlens Danley Don Wilde Mackenson Ruben',
    l: 'Pierre Jean Louis Joseph Charles Saint-Fleur Jeanty Antoine Desir Etienne Francois Michel Paul Sanon Nazon Bellegarde Jean-Baptiste Delva Duverger Alexis',
  },
  dutch_caribbean: {
    f: 'Gregory Shanon Jurien Quincy Ruben Rodney Nigel Jeremy Dwight Kevin Rigino Gevaro Roland Orlando Carlos Edgar Ronny Gerald Jean Ivan',
    l: 'Martina Cuvalier Angela Maduro Tromp Wever Koolman Wilson Pinas Kartosen Misiedjan Wijdenbosch Winter Doran Hato Zimmerman Fernandes Croes Kelly Janga Nahar',
  },
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'src/data/names/globalNameDatabase.json');
const world = JSON.parse(fs.readFileSync(path.join(root, 'src/data/worldCountries.json'), 'utf8')).countries;
const culture = JSON.parse(fs.readFileSync(path.join(root, 'src/data/playerCulture.json'), 'utf8'));
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const pools = { ...poolsA, ...poolsB };

const assign = (pool, count, codes) => Object.fromEntries(codes.split(' ').map((c) => [c, [pool, count]]));
const plan = {
  ...assign('turkish', 50, 'TUR'), ...assign('polish', 50, 'POL'), ...assign('ukrainian', 50, 'UKR'),
  ...assign('russian', 50, 'RUS'), ...assign('russian', 20, 'BLR'),
  ...assign('serbian', 50, 'SRB'), ...assign('serbian', 20, 'BIH MNE MKD SVN'),
  ...assign('czech', 50, 'CZE'), ...assign('czech', 20, 'SVK'),
  ...assign('hungarian', 50, 'HUN'), ...assign('romanian', 50, 'ROU'), ...assign('romanian', 20, 'MDA'),
  ...assign('greek', 50, 'GRE'), ...assign('greek', 20, 'CYP'),
  ...assign('danish', 50, 'DEN'), ...assign('finnish', 50, 'FIN'), ...assign('bulgarian', 50, 'BUL'),
  ...assign('hebrew', 50, 'ISR'), ...assign('swiss', 50, 'SUI'), ...assign('swiss', 20, 'LIE LUX'),
  ...assign('austrian', 50, 'AUT'), ...assign('albanian', 20, 'ALB KOS'),
  ...assign('icelandic', 20, 'ISL FRO'), ...assign('estonian', 20, 'EST'), ...assign('latvian', 20, 'LVA'),
  ...assign('lithuanian', 20, 'LTU'), ...assign('georgian', 20, 'GEO'), ...assign('armenian', 20, 'ARM'),
  ...assign('azerbaijani', 20, 'AZE'), ...assign('maltese', 20, 'MLT'), ...assign('italianate', 20, 'SMR'),
  ...assign('catalan', 20, 'AND'), ...assign('english', 20, 'AUS NZL CAN GIB NIR'),
  ...assign('persian', 50, 'IRN'), ...assign('persian', 20, 'AFG TJK'),
  ...assign('turkic', 50, 'UZB'), ...assign('turkic', 20, 'KAZ KGZ TKM'),
  ...assign('chinese', 50, 'CHN'), ...assign('chinese', 20, 'HKG TPE MAC'),
  ...assign('thai', 50, 'THA'), ...assign('vietnamese', 50, 'VIE'), ...assign('indian', 50, 'IND'),
  ...assign('bengali', 50, 'BAN'), ...assign('urdu_punjabi', 50, 'PAK'), ...assign('indonesian', 50, 'IDN'),
  ...assign('malay', 50, 'MAS'), ...assign('malay', 20, 'BRU'),
  ...assign('singaporean', 20, 'SIN'), ...assign('filipino', 20, 'PHI'), ...assign('mongolian', 20, 'MNG'),
  ...assign('nepali', 20, 'NEP'), ...assign('sinhala', 20, 'SRI'), ...assign('myanmar', 20, 'MYA'),
  ...assign('lao', 20, 'LAO'), ...assign('khmer', 20, 'CAM'), ...assign('dhivehi', 20, 'MDV'),
  ...assign('bhutanese', 20, 'BHU'), ...assign('korean_north', 20, 'PRK'), ...assign('chamorro', 20, 'GUM'),
  ...assign('arabic_maghreb', 20, 'ALG TUN LBY MTN'),
  ...assign('arabic_gulf', 20, 'KSA QAT UAE OMA BHR KUW YEM'),
  ...assign('arabic_levant', 20, 'JOR IRQ SYR PLE LIB'),
  ...assign('arabic_nile', 20, 'SDN DJI COM'),
  ...assign('central_american', 20, 'PAN CRC HON SLV GUA NCA'),
  ...assign('hispanic_caribbean', 20, 'CUB DOM PUR VEN'),
  ...assign('andean', 20, 'ECU PER BOL'), ...assign('southern_cone', 20, 'CHI PAR'),
  ...assign('lusophone_africa', 20, 'CPV GNB STP MOZ TLS'),
  ...assign('polynesian', 20, 'SAM TGA COK ASA'), ...assign('melanesian', 20, 'SOL PNG VAN'),
  ...assign('west_africa_fr', 20, 'BFA TOG BEN NIG CHA'), ...assign('west_africa_en', 20, 'SLE LBR GAM'),
  ...assign('southern_bantu', 20, 'ZAM MWI ZIM'), ...assign('sotho_tswana', 20, 'BOT LES SWZ'),
  ...assign('great_lakes', 20, 'RWA BDI'),
  ...assign('congolese', 50, 'COD'), ...assign('congolese', 20, 'CGO GAB EQG CTA'),
  ...assign('mande', 50, 'MLI'), ...assign('mande', 20, 'GUI'),
  ...assign('rsa', 50, 'RSA'), ...assign('rsa', 20, 'NAM'),
  ...assign('kenyan', 50, 'KEN'), ...assign('ugandan', 50, 'UGA'), ...assign('tanzanian', 50, 'TAN'),
  ...assign('ethiopian', 50, 'ETH'), ...assign('ethiopian', 20, 'ERI'),
  ...assign('anglo_caribbean', 20, 'JAM TRI GUY BER GRN SKN LCA ATG VIN BLZ BRB DMA MSR CAY BAH TCA VGB VIR AIA'),
  ...assign('malagasy', 20, 'MAD'), ...assign('mauritian', 20, 'MRI'), ...assign('seychellois', 20, 'SEY'),
  ...assign('somali', 20, 'SOM'), ...assign('south_sudan', 20, 'SSD'), ...assign('fijian', 20, 'FIJ'),
  ...assign('french_pacific', 20, 'NCL TAH'), ...assign('haitian', 20, 'HAI'),
  ...assign('dutch_caribbean', 20, 'CUW ARU SUR'),
};

const hash = (s) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
const clean = (s) => [...new Set(s.replace(/['â€™]/g, '').split(/\s+/).filter(Boolean))];
const slice = (list, count, code) => {
  if (list.length < count) throw new Error(`pool too small for ${code}: ${list.length} < ${count}`);
  const start = hash(code) % (list.length - count + 1);
  return list.slice(start, start + count);
};

const langs = culture.languagesByCountry ?? {};
const fluency = (i) => (i === 0 ? { Native: 98, Fluent: 2, Conversational: 0, Basic: 0 } : i === 1 ? { Native: 5, Fluent: 60, Conversational: 30, Basic: 5 } : { Native: 0, Fluent: 20, Conversational: 50, Basic: 30 });

const missing = world.filter((c) => !db.countries[c.code]);
const unassigned = missing.filter((c) => !plan[c.code]).map((c) => c.code);
if (unassigned.length) throw new Error(`Unassigned: ${unassigned.join(' ')}`);
const stale = Object.keys(plan).filter((c) => !world.some((w) => w.code === c));
if (stale.length) throw new Error(`Unknown codes in plan: ${stale.join(' ')}`);

for (const c of missing) {
  const [poolName, count] = plan[c.code];
  const pool = pools[poolName];
  if (!pool) throw new Error(`No pool ${poolName}`);
  const flag = c.flagCode;
  const langList = (langs[c.code] ?? ['English']).map((l, i) => ({ name: typeof l === 'string' ? l : l.name, fluencyRates: fluency(i) }));
  db.countries[c.code] = {
    countryName: c.name,
    code: c.code,
    iso2: flag.length === 2 ? flag : 'gb',
    flagCode: flag,
    demonym: c.name,
    supplemental: true,
    commonSecondaryCountries: [],
    defaultLanguages: langList,
    subRegions: {
      national: {
        name: c.name,
        weight: 1,
        cities: [],
        regionalLanguages: [],
        firstNames: slice(clean(pool.f), count, c.code),
        lastNames: slice(clean(pool.l), count, c.code + 'L'),
      },
    },
  };
}

const all = Object.values(db.countries);
db.metadata.totalCountries = all.length;
db.metadata.totalSubRegions = all.reduce((n, c) => n + Object.keys(c.subRegions).length, 0);
db.metadata.totalFirstNames = all.reduce((n, c) => n + Object.values(c.subRegions).reduce((m, r) => m + r.firstNames.length, 0), 0);
db.metadata.totalLastNames = all.reduce((n, c) => n + Object.values(c.subRegions).reduce((m, r) => m + r.lastNames.length, 0), 0);
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2) + '\n');
console.log(`Added ${missing.length}; total ${all.length}`);

