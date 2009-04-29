<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0"
    xmlns:xhtml="http://www.w3.org/1999/xhtml"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    xmlns:exsl="http://exslt.org/common">

    <xsl:import href="alph-infl-extras.xsl"/>
    <xsl:import href="alph-infl-match.xsl"/>
    <xsl:import href="paradigm-match.xsl"/>
    
    <xsl:output encoding="UTF-8" indent="yes" method="html"/>
    <xsl:strip-space elements="*"/>
    
    <!-- debug -->
    <xsl:param name="test_endings">        
        <div class="alph-entry"><div lemma-lex="lsj" lemma-lang="grc" lemma-id="n33457" lemma-key="ἐλαύνω" class="alph-dict"><span class="alph-hdwd">ἐλαύνω: </span><div class="alph-morph"><span context="verb" class="alph-pofs">verb</span></div></div><div class="alph-mean">drive, set in motion</div><div context="ἐλᾶ" class="alph-infl-set"><span class="alph-term">ἐλ-<span class="alph-suff">ᾶ</span></span><span context="Attic_Doric_Aeolic" class="alph-dial">(<span class="alph-nopad">Attic Doric Aeolic</span>)</span><span>(<span context="a_stem" class="alph-nopad alph-derivtype">d=a_stem</span>, <span context="aw_fut" class="alph-nopad alph-stemtype">s=aw_fut</span>, <span context="contr" class="alph-nopad alph-morphflags">m=contr</span>)</span><div class="alph-infl"><span context="1st" class="alph-pers">1st person</span><span context="singular" class="alph-num">singular;</span><span class="alph-tense">future</span><span context="indicative" class="alph-mood">indicative;</span><span class="alph-voice">active</span></div></div><div context="ἐλᾶ" class="alph-infl-set"><span class="alph-term">ἐλ-<span class="alph-suff">ᾶ</span></span><span context="epic_Doric_Aeolic" class="alph-dial">(<span class="alph-nopad">epic Doric Aeolic</span>)</span><span>(<span context="a_stem" class="alph-nopad alph-derivtype">d=a_stem</span>, <span context="aw_pr" class="alph-nopad alph-stemtype">s=aw_pr</span>, <span context="contr_poetic_rare" class="alph-nopad alph-morphflags">m=contr poetic rare</span>)</span><div class="alph-infl"><span context="1st" class="alph-pers">1st person</span><span context="singular" class="alph-num">singular;</span><span class="alph-tense">present</span><span context="subjunctive" class="alph-mood">subjunctive;</span><span class="alph-voice">active</span></div><div class="alph-infl"><span context="1st" class="alph-pers">1st person</span><span context="singular" class="alph-num">singular;</span><span class="alph-tense">present</span><span context="indicative" class="alph-mood">indicative;</span><span class="alph-voice">active</span></div></div></div>
        <!--div class="alph-entry">
            <div lemma-lex="lsj" lemma-lang="grc" lemma-id="n20598" lemma-key="βουλεύω" class="alph-dict">
                <span class="alph-hdwd">βουλεύω: </span>
                <div class="alph-morph">
                    <span context="verb" class="alph-pofs">verb</span>
                </div>
            </div>
            <div class="alph-mean">take counsel, deliberate</div>
            <div context="βουλευω" class="alph-infl-set">
                <span class="alph-term">βουλευ-<span class="alph-suff">ω</span></span>
                <span>(<span context="euw" class="alph-nopad alph-derivtype">d=euw</span>, 
                    <span context="w_stem" class="alph-nopad alph-stemtype">s=w_stem</span>)
                </span>
                <div class="alph-infl">
                    <span context="1st" class="alph-pers">1st person</span>
                    <span context="singular" class="alph-num">singular;</span>
                    <span class="alph-tense">present</span>
                    <span context="indicative" class="alph-mood">indicative;</span>
                    <span class="alph-voice">active</span>
                </div>
                <div class="alph-infl">
                    <span context="1st" class="alph-pers">1st person</span>
                    <span context="singular" class="alph-num">singular;</span>
                    <span class="alph-tense">present</span>
                    <span context="subjunctive" class="alph-mood">subjunctive;</span>
                    <span class="alph-voice">active</span>
                </div>
            </div>
        </div-->
    </xsl:param>
    
    <xsl:param name="match_pofs"/>
    <!-- the following are optional, used to select specific inflection ending(s) -->
    <xsl:param name="selected_endings" select="/.." />
    <!-- DEBUG -->
    <!--xsl:param name='selected_endings' select="exsl:node-set($test_endings)"/-->
    
    <xsl:param name="form" />
    
    <!-- by default greek vowel length is stripped but this can be overridden -->
    <xsl:param name="strip_greek_vowel_length" select="true()"/>
    
    <!-- transliterate unicode in the ending tables before matching? -->
    <xsl:param name="translit_ending_table_match" select="false()"/>
    
    <!-- skip the enclosing html and body tags -->
    <xsl:param name="fragment" />
    
    <xsl:param name="paradigm_id"/>
    
    
    <xsl:key name="footnotes" match="footnote" use="@id"/>
    
    <xsl:template match="/infl-paradigms">
        <xsl:variable name="table-notes">
            <xsl:if test="@footnote">
                <div id="table-notes">
                    <xsl:call-template name="add-footnote">
                        <xsl:with-param name="item" select="."/>
                    </xsl:call-template>
                </div>
            </xsl:if>    
        </xsl:variable>

        <xsl:variable name="infl_constraint_data">
            <xsl:if test="(not($paradigm_id) and $selected_endings)">
                <xsl:call-template name="get_paradigms_for_selection">
                    <xsl:with-param name="match_table" select="morpheus-paradigm-match"/>
                </xsl:call-template>                    
            </xsl:if>    
        </xsl:variable>        
        
        <xsl:variable name="data">
            <xsl:variable name="paradigm_list">
                <xsl:choose>
                    <xsl:when test="$paradigm_id">
                        <xsl:value-of select="$paradigm_id"/>
                    </xsl:when>
                    <xsl:when test="$infl_constraint_data">
                        <xsl:for-each select="exsl:node-set($infl_constraint_data)/match_for_infl">
                            <xsl:value-of select="@paradigm_id_ref"/>,
                        </xsl:for-each>
                    </xsl:when>
                    <xsl:otherwise>all</xsl:otherwise>
                </xsl:choose>
            </xsl:variable>
            <xsl:choose>
                <xsl:when test="$paradigm_list='all'">
                    <xsl:copy-of select="//infl-paradigm"/>
                </xsl:when>
                <xsl:when test="$paradigm_list">
                    <xsl:call-template name="get_paradigms">
                        <xsl:with-param name="list" select="$paradigm_list"/>
                        <xsl:with-param name="delimiter" select="','"/>
                    </xsl:call-template>
                </xsl:when>
            </xsl:choose>
        </xsl:variable>
        <xsl:choose>
            <xsl:when test="$fragment">
                <xsl:copy-of select="$table-notes"/>
                <div id="alph-infl-table">
                    <div class="alph-infl-caption">
                        <xsl:call-template name="form_caption">
                            <xsl:with-param name="selected_endings" select="$selected_endings"/>
                            <xsl:with-param name="form" select="$form"/>
                        </xsl:call-template>
                    </div>
                    <xsl:if test="$data = ''">
                        <xsl:apply-templates select="morpheus-paradigm-match/nomatch"/>                         
                    </xsl:if>
                    <xsl:call-template name="paradigms">
                        <xsl:with-param name="paradigms" select="exsl:node-set($data)"/>
                        <xsl:with-param name="infl_constraint_data" select="exsl:node-set($infl_constraint_data)/match_for_infl"/>
                    </xsl:call-template> 
                </div>
            </xsl:when>
            <xsl:otherwise>
                <html>
                    <head>
                        <link rel="stylesheet" type="text/css" href="chrome://alpheios/skin/alph-infl.css"/>
                        <link rel="stylesheet" type="text/css" href="chrome://alpheios/skin/alph-infl-paradigm.css"/>
                        <xsl:if test="$match_pofs">
                            <link rel="stylesheet" type="text/css" href="chrome://alpheios/skin/alph-infl-{$match_pofs}.css"/>
                        </xsl:if>
                    </head>
                    <body>
                        <xsl:copy-of select="$table-notes"/>
                        <div class="alph-infl-caption">
                            <xsl:call-template name="form_caption">
                                <xsl:with-param name="selected_endings" select="$selected_endings"/>
                                <xsl:with-param name="form" select="$form"/>
                            </xsl:call-template>
                        </div>
                        <xsl:if test="$data=''">
                            <xsl:apply-templates select="morpheus-paradigm-match/nomatch"/>                         
                        </xsl:if>                        
                        <xsl:call-template name="paradigms">
                            <xsl:with-param name="paradigms" select="exsl:node-set($data)"/>
                            <xsl:with-param name="infl_constraint_data" select="exsl:node-set($infl_constraint_data)/match_for_infl"/>                        
                        </xsl:call-template>                         
                    </body>
                </html>                
            </xsl:otherwise>
        </xsl:choose>            
    </xsl:template>
    

    <xsl:template name="paradigms">
        <xsl:param name="paradigms"/>
        <xsl:param name="infl_constraint_data"/>
        <xsl:for-each select="$paradigms/infl-paradigm">
            <xsl:variable name="paradigm_id" select="@id"/>
            <div id="{$paradigm_id}">
                <div class="title"><xsl:apply-templates select="title"/></div>
                <xsl:call-template name="paradigm_table">
                    <xsl:with-param name="tables" select="table"/>
                    <xsl:with-param name="infl_constraint_data"
                        select="$infl_constraint_data[@paradigm_id_ref = $paradigm_id]"/>
                </xsl:call-template>
            </div>
        </xsl:for-each>
    </xsl:template>
    
    <xsl:template name="paradigm_table">
        <xsl:param name="tables"/>
        <xsl:param name="infl_constraint_data"/>
        <xsl:for-each select="$tables">        
            <xsl:element name="table">
                <xsl:attribute name="class"><xsl:value-of select="@role"/></xsl:attribute>
                <xsl:for-each select="row">
                    <xsl:element name="tr">
                        <xsl:attribute name="class"><xsl:value-of select="@role"/></xsl:attribute>
                        <xsl:for-each select="cell">
                            <xsl:if test="@role = 'label'">
                                <xsl:element name="th">
                                    <xsl:variable name="class">
                                        <xsl:if test="not(following-sibling::cell[1]/text())"><xsl:text>next-empty </xsl:text></xsl:if>
                                        <xsl:if test="not(preceding-sibling::cell[1]/text())"><xsl:text>prev-empty </xsl:text></xsl:if>
                                        <xsl:if test="../@role='data' and following-sibling::cell[1]/@role[. = 'label']"><xsl:text>next-label </xsl:text></xsl:if>
                                        <xsl:if test="../@role='data' and preceding-sibling::cell[1]/@role[. = 'label']"><xsl:text>prev-label </xsl:text></xsl:if>
                                        <xsl:if test="not(text())"><xsl:text>empty-cell </xsl:text></xsl:if>
                                    </xsl:variable>
                                    <xsl:attribute name="class"><xsl:value-of select="$class"/></xsl:attribute>
                                    <xsl:for-each select="@*[local-name(.) !='role']">
                                        <xsl:attribute name="{concat('alph-',local-name(.))}"><xsl:value-of select="."/></xsl:attribute>
                                    </xsl:for-each>
                                    <xsl:apply-templates/>
                                </xsl:element>
                            </xsl:if>
                            <xsl:if test="@role='data'">
                                <xsl:variable name="selected">
                                    <xsl:if test="$selected_endings">
                                        <xsl:call-template name="check_infl_sets">
                                            <xsl:with-param name="selected_endings" 
                                                select="$selected_endings"/>
                                            <xsl:with-param name="current_data" select="."/>
                                            <xsl:with-param name="match_pofs" select="$match_pofs"/>
                                            <xsl:with-param name="strip_greek_vowel_length" select="false()"/>
                                            <xsl:with-param name="infl_constraint" 
                                                select="$infl_constraint_data"/>
                                        </xsl:call-template>
                                    </xsl:if>
                                </xsl:variable>
                                <xsl:element name="td">
                                    <xsl:attribute name="class">
                                        <!-- don't highlight empty cells -->
                                        <xsl:if test="($selected != '') and (text() or child::*/text())">selected</xsl:if>
                                    </xsl:attribute>
                                    <xsl:for-each select="@*[local-name(.) !='role']">
                                        <xsl:attribute name="{concat('alph-',local-name(.))}"><xsl:value-of select="."/></xsl:attribute>
                                    </xsl:for-each>
                                    <xsl:call-template name="add-footnote">
                                        <xsl:with-param name="item" select="."/>
                                    </xsl:call-template>
                                    <xsl:apply-templates/>
                                    
                                    <!--
                                    <div class="attributes">
                                        <xsl:for-each select="@*[local-name(.) !='role']">
                                            <xsl:value-of select="."/> 
                                            <xsl:text> </xsl:text>
                                        </xsl:for-each>
                                    </div>
                                    -->
                                </xsl:element>
                            </xsl:if>
                        </xsl:for-each>
                    </xsl:element>
                </xsl:for-each>
            </xsl:element>
        </xsl:for-each>
    </xsl:template>
     
    <xsl:template match="span">
        <xsl:copy-of select="."/>
    </xsl:template>
    
    <xsl:template name="get_paradigms">
        <xsl:param name="list" />
        <xsl:param name="seen"/>
        <xsl:param name="delimiter" />
        <xsl:variable name="newlist">
            <xsl:choose>
                <xsl:when test="contains($list, $delimiter)"><xsl:value-of select="normalize-space($list)" /></xsl:when>
                <xsl:otherwise><xsl:value-of select="concat(normalize-space($list), $delimiter)"/></xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <xsl:variable name="first" select="substring-before($newlist, $delimiter)" />
        <!-- get rid of duplicates -->
        <xsl:variable name="remaining" select="substring-after($newlist, $delimiter)" />
        <!-- eliminate duplicates -->
        <xsl:if test="not(contains($seen,concat($delimiter,$first,$delimiter)))">
            <xsl:copy-of select="//infl-paradigm[@id=$first]"/>
        </xsl:if>
        <xsl:if test="$remaining">
            <xsl:call-template name="get_paradigms"> 
                <xsl:with-param name="list" select="$remaining" />
                <xsl:with-param name="seen" select="concat($seen,$delimiter,$first,$delimiter)"/>
                <xsl:with-param name="delimiter"><xsl:value-of select="$delimiter"/></xsl:with-param>
            </xsl:call-template>
        </xsl:if>
    </xsl:template>
    
    <xsl:template name="get_paradigms_for_selection">
        <xsl:param name="match_table"/>
        <!-- for each inflection set
              get alph-dial, alph-stemtype, alph-morphflags, alph-derivtype
              look for item in morpheus-paradigm-match which has the same attributes
              if multiple take one which most matched attributes?
        -->
        <xsl:for-each select="$selected_endings//div[@class='alph-infl']">
            <xsl:variable name="infl" select="current()"/>
            <xsl:variable name="match_elems">
                <xsl:for-each select="$match_table/match">
                    <xsl:call-template name="check_constrained_match">
                        <xsl:with-param name="match_elem" select="current()"/>
                        <xsl:with-param name="infl" select="$infl"/>
                        <xsl:with-param name="infl_id" select="generate-id($infl)"/>
                    </xsl:call-template>
                </xsl:for-each>            
            </xsl:variable>   
            <xsl:variable name="best_matches">
                <xsl:call-template name="best_match">
                    <xsl:with-param name="nodes" select="exsl:node-set($match_elems)"/>
                </xsl:call-template>
            </xsl:variable>
            <xsl:copy-of select="$best_matches"/>
        </xsl:for-each>
    </xsl:template>
    
    <xsl:template name="check_constrained_match">
        <xsl:param name="infl"/>
        <xsl:param name="match_elem"/>
        <xsl:param name="infl_id"/>
        <xsl:param name="num" select="1"/>
        <xsl:variable name="num_constraints" select="count($match_elem/constraint)"/>
        <xsl:variable name="att_name"
        select="concat('alph-',$match_elem/constraint[$num]/@name)"/>
                
        <xsl:variable name="matched">
            
            <xsl:choose>
                <!-- special handling for lemma -->
                <xsl:when test="$att_name = 'alph-lemma'">
                    <xsl:if 
                        test="$infl/ancestor::div[@class='alph-infl-set']
                            /preceding-sibling::*[@class='alph-dict']/@lemma-key
                                = $match_elem/constraint[$num]/text()">1
                    </xsl:if>
                </xsl:when>
                <!-- inflection_set atts -->
                <xsl:when test="
                    ($att_name = 'alph-stemtype') or 
                    ($att_name = 'alph-derivtype') or
                    ($att_name = 'alph-morphflags') or
                    ($att_name = 'alph-dial')">   
                    <xsl:variable name="match_text_lower" 
                        select="translate($match_elem/constraint[$num]/text(),
                        'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')"/>
                    <xsl:if test="$infl/ancestor::div[@class='alph-infl-set']//*[contains(@class,$att_name) 
                        and 
                        ((translate(text(),
                        'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')= $match_text_lower)
                        or
                        (contains(
                        translate(concat('_',@context,'_'),
                        'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),
                        concat('_',$match_text_lower,'_')
                        )
                        ))
                        ]">1
                    </xsl:if>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:variable name="match_text_lower" 
                        select="translate($match_elem/constraint[$num]/text(),
                        'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')"/>
                    <xsl:if test="$infl//*[contains(@class,$att_name) 
                        and 
                        ((translate(text(),
                        'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')= $match_text_lower)
                        or
                        (contains(
                        translate(concat('_',@context,'_'),
                        'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),
                        concat('_',$match_text_lower,'_')
                        )
                        ))
                        ]">1
                    </xsl:if>
                </xsl:otherwise>
            </xsl:choose>            
        </xsl:variable>
        <xsl:choose>
            <xsl:when test="$num_constraints = $num">
                <xsl:if test="$matched=1">
                    <xsl:element name="match_for_infl">
                        <xsl:attribute name="infl_id">
                            <xsl:value-of select="$infl_id"/>
                        </xsl:attribute>
                        <xsl:attribute name="match_order">
                            <xsl:value-of select="$match_elem/@match_order"/>
                        </xsl:attribute>
                        <xsl:attribute name="paradigm_id_ref">
                            <xsl:value-of select="@paradigm_id_ref"/>
                        </xsl:attribute>
                    </xsl:element>
                </xsl:if>
            </xsl:when>
            <xsl:when test="$matched=1">
                <xsl:call-template name="check_constrained_match">
                    <xsl:with-param name="num" select="number($num+1)"/>
                    <xsl:with-param name="infl" select="$infl"/>
                    <xsl:with-param name="infl_id" select="$infl_id"/>
                    <xsl:with-param name="match_elem" select="$match_elem"/>
                </xsl:call-template>
            </xsl:when>  
            <xsl:otherwise/>
        </xsl:choose>        
    </xsl:template>
    
    <xsl:template name="best_match">
        <xsl:param name="nodes"/>
        <!-- when looking for the best match, we need to look at the matches
             for each inflection separately
        -->
        <xsl:if test="$nodes">
            <xsl:variable name="infl_ids" select="$nodes/match_for_infl/@infl_id"/>
            <xsl:for-each select="$infl_ids">
                <xsl:variable name="last_infl_id" select="."/>
                <xsl:if test="generate-id(.) = generate-id($infl_ids[.=current()])">
                    <xsl:variable name="max">
                        <xsl:for-each select="$nodes/match_for_infl[@infl_id=$last_infl_id]">
                            <xsl:sort select="@match_order" 
                                data-type="number"  
                                order="descending"/>
                            <xsl:if test="position() = 1">
                                <xsl:value-of select="number(@match_order)" />
                            </xsl:if>
                        </xsl:for-each>
                    </xsl:variable>
                    <xsl:for-each select="$nodes/match_for_infl
                        [(@infl_id=$last_infl_id) and (number(@match_order) = $max)]">
                        <xsl:copy-of select="."/>
                    </xsl:for-each>
                </xsl:if>
            </xsl:for-each>
        </xsl:if>
    </xsl:template>
    
    <xsl:template match="nomatch">
        <div class="paradigm-nomatch"><xsl:apply-templates/></div>
    </xsl:template>
</xsl:stylesheet>
